importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This usually would be populated by the build process or hardcoded
// Since we are in AI Studio, we can try to fetch the config or assume it's available
// However, service workers can't easily access the file system like Vite can.
// We'll use a placeholder that the main thread can update if needed, 
// or the user can manually fill it.
// For now, I'll use the manifest approach if possible.

// We need the firebase config here.
const firebaseConfig = {
  // These will be picked up from the browser's context or should be hardcoded
  // In our environment, it's safer to have the main thread register the SW 
  // with the config passed via query params or indexedDB if needed.
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // or any icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
