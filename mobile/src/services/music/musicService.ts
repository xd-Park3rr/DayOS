import { Linking, Platform } from 'react-native';

export const musicService = {
  playPlaylist: async (playlistUri: string) => {
    try {
      console.log(`[Music] Attempting to play Spotify URI: ${playlistUri}`);
      
      // In a full implementation with react-native-spotify-remote:
      // await SpotifyRemote.playUri(playlistUri);
      
      // Fallback: Open Spotify app via deep link
      const canOpen = await Linking.canOpenURL(playlistUri);
      if (canOpen) {
        await Linking.openURL(playlistUri);
      } else {
        // Fallback to web link if uri fails
        const webUrl = `https://open.spotify.com/playlist/${playlistUri.split(':').pop()}`;
        await Linking.openURL(webUrl);
      }
      return true;
    } catch (e) {
      console.error('[Music] Failed to trigger play:', e);
      return false;
    }
  }
};
