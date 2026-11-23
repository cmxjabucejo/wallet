// Web stand-ins for device.js. Browsers get no budget notifications.
// shortcut: no receipt photos on web; it would need IndexedDB, since photo data URLs overflow localStorage.
export const notify = async () => {};
export const photosSupported = false;
export const pickPhoto = async () => null;
export const cleanPhotos = () => {};
