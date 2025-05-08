// services/products.ts
import API from './api';

export interface ProductDTO {
  id: number;
  designation: string;
  prix: number;
  quantite: number;
  sexe?: string;
  prixPromotion?: number;
  categorieNom?: string;
  imageBase64?: string;
}

export const getAllProducts = async (): Promise<ProductDTO[]> => {
  try {
    const response = await API.get('/produits', {
      params: {
        page: 0,
        size: 20,
        ascending: true,
      },
    });
    return response.data.content; // car c'est un Page<> côté Spring Boot
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    return [];
  }
};
