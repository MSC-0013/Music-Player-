// Global variables and DOM elements
const audio = document.getElementById('audio');
const songName = document.getElementById('song-name');
const artistName = document.getElementById('artist-name');
const albumCover = document.getElementById('album-cover');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressSlider = document.getElementById('progress-slider');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');
const searchInput = document.getElementById('search-input');
const playbackSpeed = document.getElementById('playback-speed');
const equalizerBtn = document.getElementById('equalizer-btn');
const equalizerContainer = document.querySelector('.equalizer-container');
const eqPreset = document.getElementById('eq-preset');
const themeBtn = document.getElementById('theme-btn');
const musicFolderBtn = document.getElementById('music-folder-btn');
const nightModeBtn = document.getElementById('night-mode-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let isPlaying = false;
let playlist = [];
let currentTrackIndex = 0;
let isShuffled = false;
let repeatMode = 'none'; // none, one, all
let defaultMusicPath = localStorage.getItem('defaultMusicPath') || '';
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let isFullscreen = false;

// Audio Context and Effects Setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const gainNode = audioContext.createGain();
const filters = [];
let source;

// Initialize equalizer filters
const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000];
frequencies.forEach((freq, i) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 1;
    filter.gain.value = 0;
    filters.push(filter);
});

// Auto-load music directory
async function setupDefaultMusicDirectory() {
    try {
        const dirHandle = await window.showDirectoryPicker({
            mode: 'read',
            startIn: 'music'
        });
        defaultMusicPath = dirHandle;
        localStorage.setItem('defaultMusicPath', dirHandle.name);
        await scanMusicDirectory(dirHandle);
    } catch (error) {
        console.error('Error accessing music directory:', error);
    }
}

// Scan directory for music files
async function scanMusicDirectory(dirHandle) {
    try {
        playlist = [];
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && isMusicFile(entry.name)) {
                const file = await entry.getFile();
                await addToPlaylist(file);
            }
        }
        updatePlaylistUI();
        if (playlist.length > 0) {
            playTrack(0);
        }
    } catch (error) {
        console.error('Error scanning directory:', error);
    }
}

// Check if file is music
function isMusicFile(filename) {
    const musicExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
    return musicExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Enhanced metadata extraction
async function extractMetadata(file) {
    return new Promise(async (resolve) => {
        const tags = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            picture: null
        };

        try {
            if (file.type === 'audio/mpeg') {
                const arrayBuffer = await file.arrayBuffer();
                // Basic ID3 tag parsing
                const id3 = await parseID3Tags(arrayBuffer);
                if (id3) {
                    tags.title = id3.title || tags.title;
                    tags.artist = id3.artist || tags.artist;
                    tags.album = id3.album || tags.album;
                    tags.picture = id3.picture || null;
                }
            }
        } catch (error) {
            console.error('Metadata extraction error:', error);
        }

        resolve(tags);
    });
}

// Basic ID3 tag parser
async function parseID3Tags(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (view.getUint32(0) === 0x49443303) { // "ID3"
        const size = view.getUint32(6);
        // Implement basic ID3 parsing here
        // This is a simplified version
        return {
            title: extractTextFrame(view, 'TIT2'),
            artist: extractTextFrame(view, 'TPE1'),
            album: extractTextFrame(view, 'TALB')
        };
    }
    return null;
}

// Extract text frame from ID3
function extractTextFrame(view, frameId) {
    // Implement frame extraction
    // This is a placeholder
    return null;
}

// Add file to playlist with metadata
async function addToPlaylist(file) {
    const metadata = await extractMetadata(file);
    const track = {
        file: file,
        name: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        picture: metadata.picture,
        url: URL.createObjectURL(file),
        duration: await getAudioDuration(file)
    };
    playlist.push(track);
    updatePlaylistUI();
}

// Get audio duration
async function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.src = URL.createObjectURL(file);
    });
}

// Enhanced playlist UI with more details
function updatePlaylistUI() {
    playlistElement.innerHTML = '';
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="track-info">
                <span class="track-name">${track.name}</span>
                <div class="track-details">
                    <span class="track-artist">${track.artist}</span>
                    <span class="track-duration">${formatTime(track.duration)}</span>
                </div>
            </div>
            <div class="track-controls">
                <button class="btn favorite-btn" title="Add to favorites">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="btn remove-track" onclick="removeTrack(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        li.onclick = (e) => {
            if (!e.target.closest('.track-controls')) {
                playTrack(index);
            }
        };
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        playlistElement.appendChild(li);
    });
}

// Initialize the player
async function initializePlayer() {
    if (defaultMusicPath) {
        await setupDefaultMusicDirectory();
    }

    // Setup event listeners
    musicFolderBtn.addEventListener('click', setupDefaultMusicDirectory);
    
    // Initialize audio nodes
    setupAudioNodes();
    
    // Load last played song and position if available
    const lastPlayed = localStorage.getItem('lastPlayed');
    if (lastPlayed) {
        const { trackIndex, position } = JSON.parse(lastPlayed);
        if (playlist[trackIndex]) {
            playTrack(trackIndex);
            audio.currentTime = position;
        }
    }
}

// Save player state before unload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('lastPlayed', JSON.stringify({
        trackIndex: currentTrackIndex,
        position: audio.currentTime
    }));
});

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode initialization
    const nightModeBtn = document.getElementById('night-mode-btn');
    let isDarkMode = localStorage.getItem('darkMode') === 'true';

    // Initialize dark mode state
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        nightModeBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        nightModeBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
    }

    // Toggle dark mode
    function toggleNightMode() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            nightModeBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            nightModeBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
        }
    }

    // Add event listener for night mode toggle
    nightModeBtn.addEventListener('click', toggleNightMode);

    // DOM Elements
    const audio = document.getElementById('audio');
    const songName = document.getElementById('song-name');
    const artistName = document.getElementById('artist-name');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeSlider = document.getElementById('volume');
    const currentTimeDisplay = document.getElementById('current');
    const durationTimeDisplay = document.getElementById('duration');
    const progressBar = document.querySelector('.progress');
    const progressArea = document.querySelector('.progress-bar');
    const searchInput = document.getElementById('search-input');
    const fileInput = document.getElementById('file-input');
    const addMusicBtn = document.getElementById('add-music-btn');
    const playlist = document.getElementById('playlist');
    const clearPlaylistBtn = document.getElementById('clear-playlist');
    const repeatBtn = document.getElementById('repeat-btn');

    // State
    let isPlaying = false;
    let currentTrackIndex = 0;
    let songs = [];
    let repeatMode = false;

    // Functions
    function isMusicFile(filename) {
        const musicExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
        return musicExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    function handleFolderSelection(event) {
        const files = Array.from(event.target.files).filter(file => isMusicFile(file.name));
        if (files.length === 0) {
            alert('No music files found in the selected folder');
            return;
        }
        
        songs = [];
        playlist.innerHTML = '';
        
        files.forEach((file, index) => {
            const song = {
                file: file,
                name: file.name.replace(/\.[^/.]+$/, ""),
                path: URL.createObjectURL(file)
            };
            songs.push(song);
            
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="song-name">${song.name}</span>
                <span class="song-duration"></span>
            `;
            li.addEventListener('click', () => {
                currentTrackIndex = index;
                loadSong(currentTrackIndex);
                playAudio();
            });
            playlist.appendChild(li);
        });

        if (songs.length > 0) {
            loadSong(0);
        }
    }

    function loadSong(index) {
        if (songs[index]) {
            currentTrackIndex = index;
            audio.src = songs[index].path;
            songName.textContent = songs[index].name;
            artistName.textContent = '-';
            
            // Update playlist highlighting
            const items = playlist.getElementsByTagName('li');
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (items[index]) {
                items[index].classList.add('active');
            }
        }
    }

    function playAudio() {
        audio.play();
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    function pauseAudio() {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function togglePlay() {
        if (!audio.src) return;
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    function playNext() {
        if (songs.length === 0) return;
        currentTrackIndex = (currentTrackIndex + 1) % songs.length;
        loadSong(currentTrackIndex);
        if (isPlaying) playAudio();
    }

    function playPrev() {
        if (songs.length === 0) return;
        currentTrackIndex = (currentTrackIndex - 1 + songs.length) % songs.length;
        loadSong(currentTrackIndex);
        if (isPlaying) playAudio();
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateProgress() {
        if (!audio.duration) return;
        
        const duration = audio.duration;
        const currentTime = audio.currentTime;
        const progressPercent = (currentTime / duration) * 100;
        
        progressBar.style.width = `${progressPercent}%`;
        currentTimeDisplay.textContent = formatTime(currentTime);
        durationTimeDisplay.textContent = formatTime(duration);
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    }

    function filterPlaylist(query) {
        const items = playlist.getElementsByTagName('li');
        const searchTerm = query.toLowerCase();
        
        Array.from(items).forEach(item => {
            const songName = item.querySelector('.song-name').textContent.toLowerCase();
            if (songName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Event Listeners
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
        if (repeatMode) {
            loadSong(currentTrackIndex);
            playAudio();
        } else {
            playNext();
        }
    });

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);
    repeatBtn.addEventListener('click', () => {
        repeatMode = !repeatMode;
        repeatBtn.classList.toggle('active');
    });

    addMusicBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFolderSelection);
    
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
    });

    progressArea.addEventListener('click', setProgress);
    
    searchInput.addEventListener('input', (e) => {
        filterPlaylist(e.target.value);
    });
    
    clearPlaylistBtn.addEventListener('click', () => {
        songs = [];
        playlist.innerHTML = '';
        currentTrackIndex = 0;
        audio.src = '';
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        songName.textContent = 'No song selected';
        artistName.textContent = '-';
        progressBar.style.width = '0%';
        currentTimeDisplay.textContent = '0:00';
        durationTimeDisplay.textContent = '0:00';
    });

    // Fullscreen functionality
    fullscreenBtn.addEventListener('click', () => {
        if (!isFullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            document.body.classList.add('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            document.body.classList.remove('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
        isFullscreen = !isFullscreen;
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.body.classList.remove('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            isFullscreen = false;
        }
    });
});
