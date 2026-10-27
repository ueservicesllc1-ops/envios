package com.vibe.pos

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

class PosApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Se inicializa por código (sin google-services.json) con el proyecto Firebase existente.
        // TODO: registrar com.vibe.pos en la consola de Firebase y activar App Check + Play Integrity.
        if (FirebaseApp.getApps(this).isEmpty()) {
            val options = FirebaseOptions.Builder()
                .setProjectId("envios-aaf94")
                .setApplicationId("1:301889994673:android:5313a5c9cf071492890790")
                .setApiKey("AIzaSyDaPRQEibEf7rpwvd9g-APfTad0JCVVFHw")
                .setStorageBucket("envios-aaf94.firebasestorage.app")
                .build()
            FirebaseApp.initializeApp(this, options)
        }
    }
}
