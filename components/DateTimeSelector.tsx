import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../contexts/ThemeContext';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export default function DateTimeSelector({ value, onChange, minDate }: Props) {
  const pal = usePalette();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const dateStr = value.toISOString().split('T')[0];
  const timeStr = value.toTimeString().slice(0, 5);
  const minStr = minDate ? minDate.toISOString().split('T')[0] : undefined;

  const formattedDate = value.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const formattedTime = value.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  if (Platform.OS === 'web') {
    // Dynamic theme styling for web input fields
    const dynamicWebInput: React.CSSProperties = {
      flex: 1,
      backgroundColor: pal.inputBg,
      border: `1.5px solid ${pal.border}`,
      borderRadius: '14px',
      padding: '13px 16px',
      fontSize: '15px',
      color: pal.text,
      outline: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
    };

    return (
      <View style={styles.row}>
        {(React.createElement as any)('input', {
          type: 'date',
          value: dateStr,
          min: minStr,
          onChange: (e: any) => {
            const d = new Date(`${e.target.value}T${timeStr}`);
            if (!isNaN(d.getTime())) onChange(d);
          },
          style: dynamicWebInput,
        })}
        {(React.createElement as any)('input', {
          type: 'time',
          value: timeStr,
          onChange: (e: any) => {
            const d = new Date(`${dateStr}T${e.target.value}`);
            if (!isNaN(d.getTime())) onChange(d);
          },
          style: dynamicWebInput,
        })}
      </View>
    );
  }

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={[styles.btn, { backgroundColor: pal.inputBg, borderColor: pal.border }]}
          onPress={() => setShowDate(true)}
        >
          <Text style={[styles.btnText, { color: pal.text }]}>📅  {formattedDate}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: pal.inputBg, borderColor: pal.border }]}
          onPress={() => setShowTime(true)}
        >
          <Text style={[styles.btnText, { color: pal.text }]}>🕐  {formattedTime}</Text>
        </Pressable>
      </View>

      {showDate && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minDate}
          onChange={(_, d) => {
            setShowDate(false);
            if (d) onChange(new Date(d.setHours(value.getHours(), value.getMinutes())));
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={value}
          mode="time"
          onChange={(_, d) => {
            setShowTime(false);
            if (d) onChange(d);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 14, fontWeight: '600' },
});
