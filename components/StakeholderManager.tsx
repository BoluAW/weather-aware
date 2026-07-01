import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { usePalette } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import AnimatedPressable from './AnimatedPressable';

export interface LocalStakeholder {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notify: boolean;
}

interface Props {
  planId?: string;
  stakeholders: LocalStakeholder[];
  onChange: (stakeholders: LocalStakeholder[]) => void;
}

export default function StakeholderManager({ planId, stakeholders, onChange }: Props) {
  const pal = usePalette();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);

  async function handleAdd() {
    setError('');
    if (!name.trim()) { setError('Enter a name.'); return; }

    const isEmail = contact.includes('@');
    const entry: LocalStakeholder = {
      name: name.trim(),
      email: isEmail ? contact.trim() : '',
      phone: !isEmail ? contact.trim() : '',
      notify: true,
    };

    if (planId) {
      const { data, error: insertError } = await supabase
        .from('plan_stakeholders')
        .insert({ plan_id: planId, name: entry.name, email: entry.email || null, phone: entry.phone || null, notify: true })
        .select()
        .single();
      if (insertError) { setError(insertError.message); return; }
      onChange([...stakeholders, { ...entry, id: data.id }]);
    } else {
      onChange([...stakeholders, entry]);
    }

    setName('');
    setContact('');
  }

  async function handleRemove(index: number) {
    const target = stakeholders[index];
    if (planId && target.id) {
      await supabase.from('plan_stakeholders').delete().eq('id', target.id);
    }
    onChange(stakeholders.filter((_, i) => i !== index));
  }

  async function toggleNotify(index: number) {
    const target = stakeholders[index];
    const updated = { ...target, notify: !target.notify };
    if (planId && target.id) {
      await supabase.from('plan_stakeholders').update({ notify: updated.notify }).eq('id', target.id);
    }
    onChange(stakeholders.map((s, i) => (i === index ? updated : s)));
  }

  return (
    <View style={styles.container}>
      {stakeholders.map((s, i) => (
        <View key={s.id ?? i} style={[styles.row, { backgroundColor: pal.background, borderColor: pal.border }]}>
          <View style={styles.info}>
            <Text style={[styles.name, { color: pal.text }]}>{s.name}</Text>
            {(s.email || s.phone) && <Text style={[styles.contact, { color: pal.textMuted }]}>{s.email || s.phone}</Text>}
          </View>
          <AnimatedPressable onPress={() => toggleNotify(i)} scaleTo={0.9}>
            <Text style={[
              styles.notifyTag,
              s.notify
                ? [styles.notifyOn, { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }]
                : [styles.notifyOff, { backgroundColor: pal.surface, color: pal.textMuted }]
            ]}>
              {s.notify ? '🔔 Notify' : '🔕 Muted'}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => handleRemove(i)} scaleTo={0.85} style={styles.removeBtnWrap}>
            <Text style={styles.removeBtn}>✕</Text>
          </AnimatedPressable>
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              backgroundColor: pal.inputBg,
              borderColor: nameFocused ? pal.primary : pal.border,
              color: pal.text,
            },
          ]}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#94a3b8"
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
        />
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              backgroundColor: pal.inputBg,
              borderColor: contactFocused ? pal.primary : pal.border,
              color: pal.text,
            },
          ]}
          placeholder="Email or phone"
          value={contact}
          onChangeText={setContact}
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          onFocus={() => setContactFocused(true)}
          onBlur={() => setContactFocused(false)}
        />
      </View>
      <AnimatedPressable
        style={[styles.addBtn, { backgroundColor: pal.primary + '18' }]}
        onPress={handleAdd}
        scaleTo={0.97}
      >
        <Text style={[styles.addBtnText, { color: pal.primary }]}>+ Add Stakeholder</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  contact: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  notifyTag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  notifyOn: {},
  notifyOff: {},
  removeBtnWrap: { padding: 6 },
  removeBtn: { fontSize: 13, color: '#ef4444', fontWeight: '700' },

  error: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginBottom: 4 },

  addRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  addBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '700' },
});
