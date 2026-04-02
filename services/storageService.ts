import { apiService } from './apiService';
import { Car } from '../types';
import { supabase } from './supabase';

export { supabase };

export const getCars = async (subscriberId: string): Promise<Car[]> => {
  return apiService.getCars(subscriberId);
};

export const addCar = async (car: Car, subscriberId: string): Promise<Car[]> => {
  const { id, ...carData } = car;
  await apiService.addCar(carData as any, subscriberId);
  return apiService.getCars(subscriberId);
};

export const updateCar = async (car: Car, subscriberId: string): Promise<Car[]> => {
  await apiService.updateCar(car, subscriberId);
  return apiService.getCars(subscriberId);
};

export const deleteCar = async (id: string, subscriberId: string): Promise<Car[]> => {
  await apiService.deleteCar(id, subscriberId);
  return apiService.getCars(subscriberId);
};

export const saveCars = async (cars: Car[], subscriberId: string): Promise<void> => {
  await apiService.saveCars(cars, subscriberId);
};

export const getDigitalForms = async (subscriberId: string, agentId?: string) => {
  return apiService.getDigitalForms(subscriberId, agentId);
};

export const getAgreements = async (subscriberId: string, agentId?: string) => {
  return apiService.getAgreements(subscriberId, agentId);
};

export const getSecureUrl = async (bucket: string, path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600, {
      transform: {
        width: 400,
        quality: 70,
        format: 'webp' as any
      }
    }); // URL expires in 1 hour (3600 seconds)

  if (error) throw error;
  return data.signedUrl;
};
