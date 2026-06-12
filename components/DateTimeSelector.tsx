import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export default function DateTimeSelector({ value, onChange, minDate }: Props) {
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
          style: webInput,
        })}
        {(React.createElement as any)('input', {
          type: 'time',
          value: timeStr,
          onChange: (e: any) => {
            const d = new Date(`${dateStr}T${e.target.value}`);
            if (!isNaN(d.getTime())) onChange(d);
          },
          style: webInput,
        })}
      </View>
    );
  }

  return (
    <>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => setShowDate(true)}>
          <Text style={styles.btnText}>📅 {formattedDate}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setShowTime(true)}>
          <Text style={styles.btnText}>🕐 {formattedTime}</Text>
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

const webInput: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '14px 16px',
  fontSize: 15,
  color: '#0f172a',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnText: { fontSize: 14, color: '#0f172a' },
});
