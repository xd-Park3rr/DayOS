import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { bluetoothContext } from '../../services/context/bluetoothContext';
import { getDb } from '../../db/client';
import { COLORS } from '../../constants';

interface BondedDevice {
  name: string;
  address: string;
}

export function BluetoothMappingScreen() {
  const navigation = useNavigation<any>();
  const [devices, setDevices] = useState<BondedDevice[]>([]);
  const [mappings, setMappings] = useState<{ [mac: string]: any }>({});
  
  // Example activities to map to
  const activities = [
    { id: 'gym', name: 'Workout' },
    { id: 'focus', name: 'Deep Work' },
    { id: 'commute', name: 'Commuting' }
  ];

  useEffect(() => {
    const load = async () => {
      const bonded = await bluetoothContext.getBondedDevices();
      setDevices(bonded);

      const db = getDb();
      const rows = db.getAllSync<{mac_address: string, target_activity_id: string, auto_dnd: number, target_music_uri: string}>('SELECT * FROM bluetooth_device_map');
      const maps: any = {};
      rows.forEach(r => maps[r.mac_address] = r);
      setMappings(maps);
    };
    load();
  }, []);

  const saveMapping = (mac: string, name: string, activityId: string, dnd: boolean, musicUri: string) => {
    const db = getDb();
    db.runSync(
      `INSERT OR REPLACE INTO bluetooth_device_map (mac_address, name, target_activity_id, auto_dnd, target_music_uri, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [mac, name, activityId, dnd ? 1 : 0, musicUri, new Date().toISOString()]
    );
    
    setMappings(prev => ({
      ...prev,
      [mac]: { mac_address: mac, name, target_activity_id: activityId, auto_dnd: dnd ? 1 : 0, target_music_uri: musicUri }
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Context Devices</Text>
      </View>

      <ScrollView style={{ padding: 20 }}>
        <Text style={styles.desc}>Map your Bluetooth devices to activities. When connected, Jarvis will automatically switch your context.</Text>

        {devices.map(device => {
          const map = mappings[device.address] || {};
          const isMapped = !!map.mac_address;

          return (
            <View key={device.address} style={styles.deviceCard}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceMac}>{device.address}</Text>

              <View style={styles.settingRow}>
                <Text style={styles.label}>Target Activity</Text>
                <View style={styles.chipRow}>
                  {activities.map(act => (
                    <TouchableOpacity 
                      key={act.id} 
                      style={[styles.chip, map.target_activity_id === act.id && styles.chipActive]}
                      onPress={() => saveMapping(device.address, device.name, act.id, map.auto_dnd === 1, map.target_music_uri || '')}
                    >
                      <Text style={[styles.chipText, map.target_activity_id === act.id && styles.chipTextActive]}>{act.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {isMapped && (
                <>
                  <View style={styles.settingRow}>
                    <Text style={styles.label}>Music / Playlist URI (Optional)</Text>
                    <TextInput 
                      style={styles.input}
                      value={map.target_music_uri || ''}
                      onChangeText={(txt) => saveMapping(device.address, device.name, map.target_activity_id, map.auto_dnd === 1, txt)}
                      placeholder="spotify:playlist:..."
                      placeholderTextColor={COLORS.textHint}
                    />
                  </View>

                  <View style={styles.settingRowSwitch}>
                    <Text style={styles.label}>Auto-Enable DND</Text>
                    <Switch 
                      value={map.auto_dnd === 1}
                      onValueChange={(val) => saveMapping(device.address, device.name, map.target_activity_id, val, map.target_music_uri)}
                      trackColor={{ false: '#333', true: COLORS.accent }}
                    />
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { padding: 10, marginLeft: -10 },
  backText: { color: COLORS.textMuted, fontFamily: 'DMSans_500Medium' },
  title: { color: COLORS.textPrimary, fontSize: 18, fontFamily: 'DMSans_700Bold', marginLeft: 10 },
  desc: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'DMSans', marginBottom: 20, lineHeight: 22 },
  deviceCard: { backgroundColor: '#1e2025', borderRadius: 12, padding: 16, marginBottom: 16 },
  deviceName: { color: COLORS.textPrimary, fontSize: 16, fontFamily: 'DMSans_700Bold' },
  deviceMac: { color: COLORS.textHint, fontSize: 10, fontFamily: 'DMSans', marginBottom: 16 },
  settingRow: { marginBottom: 16 },
  settingRowSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' },
  chipTextActive: { color: COLORS.background, fontFamily: 'DMSans_700Bold' },
  input: { backgroundColor: '#16181c', color: COLORS.textPrimary, padding: 10, borderRadius: 8, fontFamily: 'DMSans', fontSize: 12 }
});
