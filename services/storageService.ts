import { apiService } from './apiService';
import { Car } from '../types';
import { supabase } from './supabase';

export { supabase };

export const getCars = async (companyId: string): Promise<Car[]> => {
  return apiService.getCars(companyId);
};

export const addCar = async (car: Car, companyId: string): Promise<Car[]> => {
  const { id, ...carData } = car;
  await apiService.addCar(carData as any, companyId);
  return apiService.getCars(companyId);
};

export const updateCar = async (car: Car, companyId: string): Promise<Car[]> => {
  await apiService.updateCar(car, companyId);
  return apiService.getCars(companyId);
};

export const deleteCar = async (id: string, companyId: string): Promise<Car[]> => {
  await apiService.deleteCar(id, companyId);
  return apiService.getCars(companyId);
};

export const saveCars = async (cars: Car[], companyId: string): Promise<void> => {
  await apiService.saveCars(cars, companyId);
};

export const getDigitalForms = async (companyId: string, agentId?: string) => {
  return apiService.getDigitalForms(companyId, agentId);
};

export const getAgreements = async (companyId: string, agentId?: string) => {
  return apiService.getAgreements(companyId, agentId);
};
