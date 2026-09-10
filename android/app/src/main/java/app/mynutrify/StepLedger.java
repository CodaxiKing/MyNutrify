package app.mynutrify;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Persistent daily totals; raw counter deltas are consumed exactly once. */
final class StepLedger {
    static SharedPreferences prefs(Context c) {
        String owner = c.getSharedPreferences("steps_owner", Context.MODE_PRIVATE).getString("owner", "default");
        return c.getSharedPreferences("steps_v2_" + owner, Context.MODE_PRIVATE);
    }
    static String date(long time) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(time));
    }
    static synchronized void record(Context c, long raw, long time, int boot) {
        SharedPreferences p = prefs(c);
        long last = p.getLong("raw", -1);
        boolean reboot = p.getInt("boot", boot) != boot;
        long delta = StepMath.delta(last, raw, reboot);
        String day = date(time);
        long total = p.getLong("day:" + day, 0);
        boolean vehicle = p.getBoolean("vehicle", false) && !reboot;
        SharedPreferences.Editor e = p.edit().putLong("raw", raw).putInt("boot", boot)
            .putLong("updated", time).putLong("day:" + day, total + (vehicle ? 0 : delta));
        if (reboot) e.putBoolean("vehicle", false);
        String cutoff = date(time - 90L * 86400000L);
        for (String key : p.getAll().keySet()) {
            if (key.startsWith("day:") && key.substring(4).compareTo(cutoff) < 0) e.remove(key);
        }
        e.apply();
    }
    static synchronized void activity(Context c, boolean vehicle, long elapsed) {
        SharedPreferences p = prefs(c);
        if (elapsed <= p.getLong("activityTime", -1)) return;
        p.edit().putBoolean("vehicle", vehicle).putLong("activityTime", elapsed).apply();
    }
    static synchronized JSObject snapshot(Context c) {
        SharedPreferences p = prefs(c);
        String today = date(System.currentTimeMillis());
        JSArray history = new JSArray();
        for (String key : p.getAll().keySet()) {
            if (!key.startsWith("day:")) continue;
            JSObject row = new JSObject();
            row.put("date", key.substring(4));
            row.put("steps", p.getLong(key, 0));
            history.put(row);
        }
        JSObject result = new JSObject();
        result.put("date", today);
        result.put("steps", p.getLong("day:" + today, 0));
        result.put("history", history);
        result.put("tracking", StepTrackingService.running);
        result.put("vehicle", p.getBoolean("vehicle", false));
        result.put("filterAvailable", p.getBoolean("filterAvailable", false));
        result.put("updated", p.getLong("updated", 0));
        result.put("goal", p.getInt("goal", 8000));
        return result;
    }
}
