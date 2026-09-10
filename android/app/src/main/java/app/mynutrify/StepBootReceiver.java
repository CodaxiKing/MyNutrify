package app.mynutrify;

import android.content.*;

public class StepBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;
        StepLedger.prefs(context).edit().putBoolean("vehicle", false).remove("activityTime").apply();
        if (StepLedger.prefs(context).getBoolean("enabled", false)) {
            try { StepTrackingService.start(context); } catch (RuntimeException ignored) {
                // Permission revoked or OS restriction: user can resume from the card.
            }
        }
    }
}
