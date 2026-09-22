import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ClientFormScreen } from '../../../../../components/clients/ClientFormScreen';

export default function EditClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClientFormScreen mode="edit" clientId={id} />;
}
