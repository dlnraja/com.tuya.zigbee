import fs from 'fs';
import path from 'path';

export default function buildMatrix() {
  // Logique pour générer la matrice des appareils
  const deviceMatrix = [
    'modelId,modelAlias,manufacturer,product_name,driver_id,driver_path,clusters,capabilities,status,score,sources,first_seen,last_seen,notes'
  ];
  
  const csvContent = deviceMatrix.join('\n');
  fs.writeFileSync(path.join('..', 'data', 'device_matrix.csv'), csvContent);
  console.log('Device matrix built successfully!');
}
