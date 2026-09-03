window.GYM_CONFIG = {
  appName: "Grip Gym",

  // Choose one of the 10 available themes. Change this value to rebrand your gym.
  colorTheme: "neon-lime",

  firebase: {
    apiKey: "AIzaSyCa8DnD_SWArBLqIxTGe3iDv6DfpBOAdbg",
    authDomain: "gripgymflow.firebaseapp.com",
    projectId: "gripgymflow",
    storageBucket: "gripgymflow.firebasestorage.app",
    messagingSenderId: "786784728002",
    appId: "1:786784728002:web:219194d82044cb72c65c5b",
    measurementId: "G-6LX6SDJR5Q"
  }
};

// Apply color theme immediately so the browser paints the correct theme on the
// first frame.
(function () {
  var t = window.GYM_CONFIG.colorTheme;
  if (t && t !== "neon-lime") {
    document.documentElement.setAttribute("data-color-theme", t);
  }
})();
