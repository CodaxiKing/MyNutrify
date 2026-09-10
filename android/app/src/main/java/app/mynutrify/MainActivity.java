package app.mynutrify;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // O registro precisa acontecer antes do super.onCreate, que é onde a
        // ponte com a WebView é montada.
        registerPlugin(StepCounterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
