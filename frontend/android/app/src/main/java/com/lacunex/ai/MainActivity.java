package com.lacunex.ai;

import android.os.Bundle;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge layout
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Make status bar transparent
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);

        // Dark navigation bar to match Lacunex theme
        window.setNavigationBarColor(android.graphics.Color.parseColor("#050A14"));
    }
}
