import { apiService } from './apiService';
import { supabase } from './supabase';
import { Car } from '../types';

export const getCars = async (): Promise<Car[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return apiService.getCars(user.id);
};

export const addCar = async (car: Car): Promise<Car[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { id, ...carData } = car;
  await apiService.addCar(carData as any, user.id);
  return apiService.getCars(user.id);
};

export const updateCar = async (car: Car): Promise<Car[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('cars')
    .update(car)
    .eq('id', car.id)
    .eq('company_id', user.id);
    
  if (error) throw error;
  return apiService.getCars(user.id);
};

export const deleteCar = async (id: string): Promise<Car[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await apiService.deleteCar(id, user.id);
  return apiService.getCars(user.id);
};

export const saveCars = async (cars: Car[]): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Delete all existing cars for this company
  await supabase.from('cars').delete().eq('company_id', user.id);
  
  // Insert new ones
  const carsToInsert = cars.map(c => {
    const { id, ...data } = c;
    return { ...data, company_id: user.id };
  });
  
  const { error } = await supabase.from('cars').insert(carsToInsert);
  if (error) throw error;
};
