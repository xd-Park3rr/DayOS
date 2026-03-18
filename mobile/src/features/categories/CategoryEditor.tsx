import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants';
// Basic category editor skeleton
export function CategoryEditor({ route, navigation }: any) {
  const [name, setName] = useState('');
  const [anchor, setAnchor] = useState('');
  const onSave = () => {
    // Save to repo logic (requires category ID usually)
    navigation.goBack();
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Category</Text>
      
      <Text style={styles.label}>Category Name</Text>
      <TextInput 
        style={styles.input} 
        value={name} 
        onChangeText={setName} 
        placeholder="e.g. Martial arts/sport" 
        placeholderTextColor={COLORS.textHint} 
      />

      <Text style={styles.label}>Identity Anchor</Text>
      <TextInput 
        style={styles.input} 
        value={anchor} 
        onChangeText={setAnchor} 
        placeholder="e.g. Competition-ready by July" 
        placeholderTextColor={COLORS.textHint} 
      />

      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.surface, color: COLORS.textPrimary, padding: 14, borderRadius: 8 },
  saveBtn: { backgroundColor: COLORS.accent, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  saveText: { color: COLORS.background, fontWeight: 'bold' }
});
