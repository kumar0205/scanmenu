import { Capacitor } from '@capacitor/core';

export function playSynthNotification() {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = [880, 1100, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      // Set synth beep volume to 0.9 (max volume without clipping)
      gain.gain.setValueAtTime(0.9, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.15);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.15);
    });
    setTimeout(() => {
      ctx.close().catch(console.error);
    }, 1000);
  } catch {
    // AudioContext not available
  }
}

export function playNotification(soundUrl?: string) {
  try {
    if (soundUrl) {
      // Only append cache-busting timestamp to network URLs, not base64 data URLs
      const cacheBusterUrl = soundUrl.startsWith('data:')
        ? soundUrl
        : (soundUrl.includes('?') ? `${soundUrl}&t=${Date.now()}` : `${soundUrl}?t=${Date.now()}`);
      
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.src = cacheBusterUrl;
      audio.volume = 1.0; // Max volume
      
      audio.play().catch(err => {
        console.warn("Failed to play custom notification sound (autoplay blocked or network error):", err);
        playSynthNotification();
      });
    } else {
      playSynthNotification();
    }
  } catch (err) {
    console.error("Audio playback error:", err);
    playSynthNotification();
  }
}

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (err) {
      console.error('Failed to request Capacitor notification permissions:', err);
    }
  } else if ('Notification' in window) {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  }
}

export async function showLocalNotification(title: string, body: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 100000) + 1,
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_stat_icon_name',
              sound: undefined,
              attachments: [],
              actionTypeId: '',
              extra: null,
            },
          ],
        });
      }
    } catch (err) {
      console.error('Failed to show Capacitor local notification:', err);
    }
  } else if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}
