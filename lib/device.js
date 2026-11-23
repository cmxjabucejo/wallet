// Phone-only features: local notifications and receipt photos. Web gets the no-op device.web.js instead.
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Shows a notification now. Asks for permission the first time; does nothing if it's denied.
export async function notify(title, body) {
  try {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync('default', { name: 'Budget alerts', importance: Notifications.AndroidImportance.DEFAULT });
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
    if (granted) await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {}
}

export const photosSupported = true;
const receipts = () => new Directory(Paths.document, 'receipts');

// Takes or picks a photo and copies it out of the picker's cache, which the OS may clear. Returns its uri, or null.
export async function pickPhoto(camera) {
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return null;
  const pick = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const r = await pick({ mediaTypes: ['images'], quality: 0.5 });
  if (r.canceled || !r.assets?.length) return null;
  const dir = receipts();
  dir.create({ idempotent: true });
  const src = new File(r.assets[0].uri);
  const dest = new File(dir, `${Date.now()}-${src.name}`);
  await src.copy(dest);
  return dest.uri;
}

// Deletes receipt files no expense points to (left behind by deleted expenses). Only call with successfully loaded data.
export function cleanPhotos(wallets) {
  try {
    const dir = receipts();
    if (!dir.exists) return;
    const used = new Set(wallets.flatMap((w) => w.budgets.flatMap((b) => b.expenses.map((e) => e.photo?.split('/').pop()))));
    for (const f of dir.list()) if (f instanceof File && !used.has(f.name)) f.delete();
  } catch {}
}
