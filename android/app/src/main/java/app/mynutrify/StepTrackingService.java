package app.mynutrify;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.hardware.*;
import android.os.*;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.*;
import java.util.*;

/** Foreground owner of the sensor, independent of the WebView lifecycle. */
public class StepTrackingService extends Service implements SensorEventListener {
    static volatile boolean running;
    private SensorManager manager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final String CHANNEL = "daily_steps";
    private static final int ID = 2401;
    private long lastNotification;
    private final Runnable refresh = new Runnable() {
        public void run() { notifySteps(); handler.postDelayed(this, 30000); }
    };
    static void start(Context context) {
        Intent intent = new Intent(context, StepTrackingService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }
    @Override public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 29 && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf(); return;
        }
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Passos de hoje", NotificationManager.IMPORTANCE_LOW));
        if (Build.VERSION.SDK_INT >= 34) startForeground(ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
        else startForeground(ID, notification());
        manager = (SensorManager) getSystemService(SENSOR_SERVICE);
        Sensor sensor = manager == null ? null : manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null || !manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)) {
            stopSelf(); return;
        }
        running = true;
        registerActivities();
        handler.post(refresh);
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onSensorChanged(SensorEvent event) {
        long wallTime = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1000000L;
        int boot = Settings.Global.getInt(getContentResolver(), Settings.Global.BOOT_COUNT, 0);
        StepLedger.record(this, (long) event.values[0], wallTime, boot);
        if (SystemClock.elapsedRealtime() - lastNotification >= 3000) notifySteps();
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    private Notification notification() {
        SharedPreferences p = StepLedger.prefs(this);
        long steps = p.getLong("day:" + StepLedger.date(System.currentTimeMillis()), 0);
        int goal = p.getInt("goal", 8000);
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String state = p.getBoolean("vehicle", false) ? "Em veículo • contagem pausada" : "Contando passos";
        if (!p.getBoolean("filterAvailable", false)) state += " • filtro de veículo indisponível";
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_steps).setContentTitle(String.format(Locale.forLanguageTag("pt-BR"), "%,d passos hoje", steps))
            .setContentText(state + " • meta " + goal).setContentIntent(open)
            .setProgress(goal, (int) Math.min(steps, goal), false)
            .setOngoing(true).setOnlyAlertOnce(true).setSilent(true).setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE).build();
    }
    private void notifySteps() {
        getSystemService(NotificationManager.class).notify(ID, notification());
        lastNotification = SystemClock.elapsedRealtime();
    }
    private PendingIntent activityIntent() {
        return PendingIntent.getBroadcast(this, 0, new Intent(this, ActivityTransitionReceiver.class),
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
    }
    private void registerActivities() {
        if (Build.VERSION.SDK_INT >= 29 && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            StepLedger.prefs(this).edit().putBoolean("filterAvailable", false).putBoolean("vehicle", false).apply();
            return;
        }
        List<ActivityTransition> list = new ArrayList<>();
        for (int type : new int[]{DetectedActivity.IN_VEHICLE, DetectedActivity.WALKING, DetectedActivity.RUNNING}) {
            list.add(new ActivityTransition.Builder().setActivityType(type).setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER).build());
            if (type == DetectedActivity.IN_VEHICLE) list.add(new ActivityTransition.Builder().setActivityType(type).setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT).build());
        }
        try {
            ActivityRecognition.getClient(this).requestActivityTransitionUpdates(new ActivityTransitionRequest(list), activityIntent())
                .addOnSuccessListener(v -> StepLedger.prefs(this).edit().putBoolean("filterAvailable", true).apply())
                .addOnFailureListener(e -> StepLedger.prefs(this).edit().putBoolean("filterAvailable", false).putBoolean("vehicle", false).apply());
        } catch (SecurityException e) {
            StepLedger.prefs(this).edit().putBoolean("filterAvailable", false).putBoolean("vehicle", false).apply();
        } catch (Exception e) { StepLedger.prefs(this).edit().putBoolean("filterAvailable", false).putBoolean("vehicle", false).apply(); }
    }
    @Override public void onDestroy() {
        running = false;
        handler.removeCallbacksAndMessages(null);
        if (manager != null) manager.unregisterListener(this);
        try { ActivityRecognition.getClient(this).removeActivityTransitionUpdates(activityIntent()); }
        catch (SecurityException ignored) { /* Permission can be revoked while the service runs. */ }
        catch (Exception ignored) {}
        super.onDestroy();
    }
}
