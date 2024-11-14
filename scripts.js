const audio = document.getElementById('audio');
const songName = document.getElementById('song-name');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressSlider = document.getElementById('progress-slider');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');
let isPlaying = false;

// Background images array
const backgrounds = ['1.jpg', '2.jpg', '3.jpg', '4.jpg'];
let bgIndex = 0;

// Function to update background image
function updateBackground() {
    document.body.style.backgroundImage = `url(${backgrounds[bgIndex]})`;
    bgIndex = (bgIndex + 1) % backgrounds.length; // Loop through images
}
setInterval(updateBackground, 5000); // Change background every 5 seconds
updateBackground(); // Initial background set

// Choose Song Button
document.getElementById('choose-btn').addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            audio.src = URL.createObjectURL(file);
            songName.textContent = file.name;
            playSong();
        }
    };
    fileInput.click();
});

// Play/Pause Button
playPauseBtn.addEventListener('click', () => {
    isPlaying ? pauseSong() : playSong();
});

// Backward Button
document.getElementById('backward-btn').addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
});

// Forward Button
document.getElementById('forward-btn').addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
});

// Volume Control
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value;
});

// Update Progress Bar and Time
audio.addEventListener('timeupdate', () => {
    const currentTime = formatTime(audio.currentTime);
    const duration = formatTime(audio.duration);
    currentTimeDisplay.textContent = currentTime;
    durationTimeDisplay.textContent = duration;

    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressSlider.value = progressPercent;
});

// Seek in Song
progressSlider.addEventListener('input', () => {
    const seekTime = (progressSlider.value / 100) * audio.duration;
    audio.currentTime = seekTime;
});

// Play the Song
function playSong() {
    audio.play();
    isPlaying = true;
    playPauseBtn.textContent = '⏸️';
}

// Pause the Song
function pauseSong() {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = '▶️';
}

// Format Time in mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Reset Play Button when Song Ends
audio.addEventListener('ended', () => {
    pauseSong();
    audio.currentTime = 0;
    progressSlider.value = 0;
});
