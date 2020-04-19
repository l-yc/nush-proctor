(function() {
    // Grab elements, create settings, etc.

    // Get access to the camera!
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let userList = document.querySelector('#user-list');

        let cameraVideo = null;
        let shareCamera = document.getElementById('share-camera');
        shareCamera.addEventListener('click', e => {
            cameraVideo = document.getElementById('camera');
            // Not adding `{ audio: true }` since we only want video now
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
                //cameraVideo.src = window.URL.createObjectURL(stream);
                console.log(stream);
                cameraVideo.srcObject = stream;
                cameraVideo.play();

                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
            });

        });

        let screenVideo = null;
        let shareScreen = document.getElementById('share-screen');
        shareScreen.addEventListener('click', e => {
            screenVideo = document.getElementById('screen');
            navigator.mediaDevices.getDisplayMedia({ video: true }).then(function(stream) {
                screenVideo.srcObject = stream
                screenVideo.play();
            }).catch(err => {
                console.log(err);
            });
        });
        
        // Taking snapshots
        let photoGallery = document.getElementById('photo-gallery');

        // Trigger photo take
        document.getElementById("snap").addEventListener("click", function() {
            var canvas = document.createElement('canvas');
            canvas.classList.add('photo');

            var context = canvas.getContext('2d');
            var video = document.getElementById('video');
            //context.drawImage(cameraVideo, 0, 0, 640, 480);

            let dim = cameraVideo.getBoundingClientRect();
            canvas.width = dim.width;
            canvas.height = dim.height;

            context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
            photoGallery.appendChild(canvas);
        });
    } else {
        alert('your device is not supported');
    }

})();

/* Legacy code below: getUserMedia 
else if(navigator.getUserMedia) { // Standard
    navigator.getUserMedia({ video: true }, function(stream) {
        video.src = stream;
        video.play();
    }, errBack);
} else if(navigator.webkitGetUserMedia) { // WebKit-prefixed
    navigator.webkitGetUserMedia({ video: true }, function(stream){
        video.src = window.webkitURL.createObjectURL(stream);
        video.play();
    }, errBack);
} else if(navigator.mozGetUserMedia) { // Mozilla-prefixed
    navigator.mozGetUserMedia({ video: true }, function(stream){
        video.srcObject = stream;
        video.play();
    }, errBack);
}
*/
