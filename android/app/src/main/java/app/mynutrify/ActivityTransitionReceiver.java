package app.mynutrify;

import android.content.*;
import com.google.android.gms.location.*;

/** Transitions update state even when no step event arrives (e.g. on exiting a bus). */
public class ActivityTransitionReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!StepLedger.prefs(context).getBoolean("enabled", false)) return;
        if (!ActivityTransitionResult.hasResult(intent)) return;
        ActivityTransitionResult result = ActivityTransitionResult.extractResult(intent);
        if (result == null) return;
        for (ActivityTransitionEvent event : result.getTransitionEvents()) {
            int type = event.getActivityType();
            int transition = event.getTransitionType();
            if (type == DetectedActivity.IN_VEHICLE) {
                StepLedger.activity(context, transition == ActivityTransition.ACTIVITY_TRANSITION_ENTER, event.getElapsedRealTimeNanos());
            } else if ((type == DetectedActivity.WALKING || type == DetectedActivity.RUNNING) && transition == ActivityTransition.ACTIVITY_TRANSITION_ENTER) {
                StepLedger.activity(context, false, event.getElapsedRealTimeNanos());
            }
        }
    }
}
