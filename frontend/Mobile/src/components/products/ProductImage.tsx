import React, { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { colors, radius } from '../../theme';

export interface ProductImageProps {
  uri?: string | null;
  size?: number;
  width?: number;
  height?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function ProductImage({
  uri,
  size,
  width = 80,
  height = 80,
  style,
  imageStyle,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const w = size ?? width;
  const h = size ?? height;

  if (!uri || hasError) {
    return (
      <View style={[styles.placeholder, { width: w, height: h }, style]}>
        <ShoppingBag size={Math.min(w, h) * 0.4} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: w, height: h }, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, { width: w, height: h }, imageStyle]}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
  },
  placeholder: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    borderRadius: radius.md,
  },
});
