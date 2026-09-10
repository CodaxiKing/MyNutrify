package app.mynutrify;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name = "StepCounter", permissions = {
    @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION }),
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class StepCounterPlugin extends Plugin {
    @PluginMethod public void configure(PluginCall call) {
        String owner = call.getString("owner");
        if (owner == null || owner.isEmpty()) { call.reject("Conta necessária"); return; }
        android.content.SharedPreferences config = getContext().getSharedPreferences("steps_owner", android.content.Context.MODE_PRIVATE);
        if (!owner.equals(config.getString("owner", "default"))) {
            getContext().stopService(new Intent(getContext(), StepTrackingService.class));
            StepLedger.prefs(getContext()).edit().remove("raw").putBoolean("vehicle", false).apply();
            config.edit().putString("owner", owner).apply();
            StepLedger.prefs(getContext()).edit().remove("raw").putBoolean("vehicle", false).remove("activityTime").apply();
        }
        call.resolve();
    }
    private boolean granted() {
        return Build.VERSION.SDK_INT < 29 || getContext().checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }
    @PluginMethod public void isAvailable(PluginCall call) {
        SensorManager m = (SensorManager) getContext().getSystemService(android.content.Context.SENSOR_SERVICE);
        JSObject result = new JSObject();
        result.put("available", m != null && m.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null);
        result.put("granted", granted());
        result.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        result.put("enabled", StepLedger.prefs(getContext()).getBoolean("enabled", false));
        call.resolve(result);
    }
    @PluginMethod public void requestPermission(PluginCall call) {
        if (!granted()) requestPermissionForAlias("activity", call, "activityResult");
        else requestNotifications(call);
    }
    @PermissionCallback private void activityResult(PluginCall call) {
        if (!granted()) { call.resolve(new JSObject().put("granted", false)); return; }
        requestNotifications(call);
    }
    private void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissionForAlias("notifications", call, "notificationResult");
        else startTracking(call);
    }
    @PermissionCallback private void notificationResult(PluginCall call) { startTracking(call); }
    @PluginMethod public void startTracking(PluginCall call) {
        if (!granted()) { call.reject("Permissão de atividade física necessária"); return; }
        // Seed only on migration; never replace an existing native daily total.
        android.content.SharedPreferences p = StepLedger.prefs(getContext());
        String today = StepLedger.date(System.currentTimeMillis());
        String key = "day:" + today;
        android.content.SharedPreferences.Editor e = p.edit().putBoolean("enabled", true);
        if (!p.contains("raw") && !p.contains(key)) e.putLong(key, Math.max(0, call.getInt("initialSteps", 0)));
        e.apply();
        try {
            StepTrackingService.start(getContext());
            call.resolve(new JSObject().put("granted", true));
        } catch (RuntimeException error) { call.reject("Não foi possível iniciar a contagem", error); }
    }
    @PluginMethod public void stopTracking(PluginCall call) {
        StepLedger.prefs(getContext()).edit().putBoolean("enabled", false).remove("raw").putBoolean("vehicle", false).apply();
        getContext().stopService(new Intent(getContext(), StepTrackingService.class));
        call.resolve();
    }
    @PluginMethod public void getStepCount(PluginCall call) { call.resolve(StepLedger.snapshot(getContext())); }
    @PluginMethod public void setGoal(PluginCall call) {
        int goal = call.getInt("goal", 8000);
        if (goal < 100 || goal > 100000) { call.reject("Meta deve estar entre 100 e 100.000 passos"); return; }
        StepLedger.prefs(getContext()).edit().putInt("goal", goal).apply();
        call.resolve();
    }
}
