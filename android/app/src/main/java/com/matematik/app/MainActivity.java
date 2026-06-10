package com.matematik.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        // Prevent WebView from extending behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
