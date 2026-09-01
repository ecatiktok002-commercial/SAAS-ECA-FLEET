/**
 * AI Service for Dashboard Meter Identification (Odometer Mileage & Fuel Level Gauge)
 */

export interface DashboardMeterReading {
  success: boolean;
  mileage: number | null;
  fuelLevel: string | null;
  confidence?: number;
  notes?: string;
  error?: string;
}

/**
 * Converts a File object to a base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Identify Dashboard Meters (Left Bar: Fuel Level, Bottom Part: Integer Mileage)
 * Calls the server-side `/api/identify-dashboard` endpoint powered by Gemini AI.
 */
export async function identifyDashboardMeters(
  imageSource: File | string
): Promise<DashboardMeterReading> {
  try {
    let base64String = '';
    let mimeType = 'image/jpeg';

    if (imageSource instanceof File) {
      base64String = await fileToBase64(imageSource);
      mimeType = imageSource.type || 'image/jpeg';
    } else {
      base64String = imageSource;
      if (base64String.startsWith('data:')) {
        const match = base64String.match(/^data:([^;]+);base64,/);
        if (match) {
          mimeType = match[1];
        }
      }
    }

    const response = await fetch('/api/identify-dashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64String,
        mimeType,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        mileage: null,
        fuelLevel: null,
        error: data.error || 'Could not parse dashboard meters',
      };
    }

    // Format fuel level to ensure standard format
    let fuelLevel = data.fuel_level;
    if (fuelLevel) {
      const flLower = String(fuelLevel).toLowerCase();
      if (flLower.includes('full') || flLower.includes('8 bar')) {
        fuelLevel = 'Full Tank';
      } else if (flLower.includes('7 bar')) {
        fuelLevel = '7 Bar';
      } else if (flLower.includes('6 bar')) {
        fuelLevel = '6 Bar';
      } else if (flLower.includes('5 bar')) {
        fuelLevel = '5 Bar';
      } else if (flLower.includes('4 bar') || flLower.includes('half')) {
        fuelLevel = '4 Bar';
      } else if (flLower.includes('3 bar')) {
        fuelLevel = '3 Bar';
      } else if (flLower.includes('2 bar')) {
        fuelLevel = '2 Bar';
      } else if (flLower.includes('1 bar') || flLower.includes('empty')) {
        fuelLevel = '1 Bar';
      }
    }

    return {
      success: true,
      mileage: data.mileage != null ? Math.round(Number(data.mileage)) : null,
      fuelLevel: fuelLevel || null,
      confidence: data.confidence,
      notes: data.notes,
    };
  } catch (err: any) {
    console.error('identifyDashboardMeters error:', err);
    return {
      success: false,
      mileage: null,
      fuelLevel: null,
      error: err.message || 'AI meter scan failed',
    };
  }
}
