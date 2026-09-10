package app.mynutrify;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class StepMathTest {
    @Test public void activationDoesNotImportEarlierSteps() {
        assertEquals(0, StepMath.delta(-1, 45000, false));
    }
    @Test public void duplicateSensorEventsAreIdempotent() {
        assertEquals(0, StepMath.delta(1234, 1234, false));
    }
    @Test public void rebootPreservesTotalAndAddsNewBootSteps() {
        long savedDailyTotal = 3000;
        assertEquals(3042, savedDailyTotal + StepMath.delta(10000, 42, true));
    }
    @Test public void rebootDetectedEvenWhenNewCounterExceedsOldCounter() {
        assertEquals(600, StepMath.delta(400, 600, true));
    }
    @Test public void counterResetWithoutBootSignalDoesNotLoseNewSteps() {
        assertEquals(12, StepMath.delta(400, 12, false));
    }
    @Test public void newDayConsumesDeltaInsteadOfResettingBaselineAtAppOpen() {
        assertEquals(800, StepMath.delta(20000, 20800, false));
    }
}
