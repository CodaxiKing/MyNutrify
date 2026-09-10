package app.mynutrify;

final class StepMath {
    private StepMath() {}
    static long delta(long previous, long current, boolean reboot) {
        if (previous < 0) return 0; // Never claim steps before activation.
        if (reboot || current < previous) return Math.max(0, current);
        return Math.max(0, current - previous);
    }
}
