# cache_github_mcp.py
import os
import json
import hashlib
import time
import requests
from pathlib import Path
from typing import Dict, Any, Optional, Union

class GitHubModelCache:
    """
    Clase para gestionar el cacheo de modelos desde GitHub
    """
    def __init__(self, cache_dir: str = None, max_age: int = 86400):
        """
        Inicializa el sistema de caché para modelos de GitHub
        
        Args:
            cache_dir: Directorio donde se almacenará la caché. Por defecto es '.cache' en el directorio actual
            max_age: Tiempo máximo de vida de la caché en segundos (por defecto: 24 horas)
        """
        self.cache_dir = Path(cache_dir or Path.cwd() / '.cache')
        self.max_age = max_age  # 24 horas por defecto
        
        # Crear directorio de caché si no existe
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def _get_cache_filename(self, url: str) -> Path:
        """
        Genera un nombre de archivo único basado en la URL
        
        Args:
            url: URL del recurso a cachear
            
        Returns:
            Path: Ruta del archivo de caché
        """
        hash_obj = hashlib.md5(url.encode())
        return self.cache_dir / f"{hash_obj.hexdigest()}.json"
    
    def _save_metadata(self, cache_file: Path, metadata: Dict[str, Any]) -> None:
        """
        Guarda metadatos del archivo cacheado
        
        Args:
            cache_file: Ruta del archivo de caché
            metadata: Metadatos a guardar
        """
        meta_file = Path(f"{cache_file}.meta")
        with open(meta_file, 'w') as f:
            json.dump({
                'url': metadata['url'],
                'timestamp': time.time(),
                'etag': metadata.get('etag'),
                'last_modified': metadata.get('last_modified')
            }, f)
    
    def _get_metadata(self, cache_file: Path) -> Optional[Dict[str, Any]]:
        """
        Obtiene los metadatos de un archivo cacheado
        
        Args:
            cache_file: Ruta del archivo de caché
            
        Returns:
            Dict o None: Metadatos o None si no existen
        """
        meta_file = Path(f"{cache_file}.meta")
        if meta_file.exists():
            with open(meta_file, 'r') as f:
                return json.load(f)
        return None
    
    def _is_cache_valid(self, cache_file: Path) -> bool:
        """
        Verifica si un archivo de caché es válido
        
        Args:
            cache_file: Ruta del archivo de caché
            
        Returns:
            bool: True si el archivo está en caché y es válido
        """
        if not cache_file.exists():
            return False
            
        metadata = self._get_metadata(cache_file)
        if not metadata:
            return False
            
        age = time.time() - metadata['timestamp']
        return age < self.max_age
    
    def get_model(self, url: str, **kwargs) -> Any:
        """
        Obtiene un modelo desde GitHub con soporte para caché
        
        Args:
            url: URL del modelo en GitHub
            **kwargs: Argumentos adicionales para requests.get
            
        Returns:
            Any: El modelo cargado
        """
        cache_file = self._get_cache_filename(url)
        
        # Si existe caché válida, usar la versión cacheada
        if self._is_cache_valid(cache_file):
            print(f"[Cache] Usando versión cacheada de {url}")
            with open(cache_file, 'r') as f:
                return json.load(f)
        
        print(f"[Cache] Descargando modelo desde {url}")
        
        # Preparar headers para soporte condicional
        headers = {}
        metadata = self._get_metadata(cache_file)
        
        if metadata:
            if metadata.get('etag'):
                headers['If-None-Match'] = metadata['etag']
            if metadata.get('last_modified'):
                headers['If-Modified-Since'] = metadata['last_modified']
        
        try:
            # Descargar el modelo
            response = requests.get(url, headers=headers, **kwargs)
            
            # Si el servidor devuelve 304 Not Modified, usar la versión cacheada
            if response.status_code == 304 and cache_file.exists():
                print("[Cache] El modelo no ha cambiado, usando versión cacheada")
                self._save_metadata(cache_file, {
                    'url': url,
                    'etag': response.headers.get('ETag'),
                    'last_modified': response.headers.get('Last-Modified')
                })
                with open(cache_file, 'r') as f:
                    return json.load(f)
            
            # Verificar si la respuesta fue exitosa
            response.raise_for_status()
            
            # Convertir respuesta a JSON
            model_data = response.json()
            
            # Guardar el nuevo modelo en caché
            with open(cache_file, 'w') as f:
                json.dump(model_data, f)
            
            # Guardar metadatos para validación futura
            self._save_metadata(cache_file, {
                'url': url,
                'etag': response.headers.get('ETag'),
                'last_modified': response.headers.get('Last-Modified')
            })
            
            return model_data
            
        except requests.RequestException as e:
            print(f"[Cache] Error al descargar el modelo: {str(e)}")
            
            # Si hay una versión cacheada, usarla como fallback
            if cache_file.exists():
                print("[Cache] Usando versión cacheada como fallback")
                with open(cache_file, 'r') as f:
                    return json.load(f)
            
            # Si no hay fallback, propagar el error
            raise
    
    def clean_old_cache(self) -> None:
        """
        Limpia archivos de caché antiguos
        """
        for meta_file in self.cache_dir.glob('*.meta'):
            with open(meta_file, 'r') as f:
                metadata = json.load(f)
            
            age = time.time() - metadata['timestamp']
            if age > self.max_age:
                cache_file = meta_file.with_suffix('')
                if cache_file.exists():
                    os.remove(cache_file)
                os.remove(meta_file)
                print(f"[Cache] Eliminado archivo antiguo: {meta_file.name}")


# Ejemplo de uso
def ejemplo_uso():
    model_cache = GitHubModelCache(
        cache_dir='./model-cache',
        max_age=7 * 24 * 3600  # 7 días
    )
    
    try:
        # URL ejemplo de un modelo en GitHub (raw)
        model_url = 'https://raw.githubusercontent.com/usuario/repo/main/modelo.json'
        
        # Cargar el modelo (desde caché o desde GitHub)
        model = model_cache.get_model(model_url)
        
        print('Modelo cargado correctamente')
        # Aquí utilizarías el modelo
        
        # Limpiar caché antigua periódicamente
        model_cache.clean_old_cache()
    except Exception as e:
        print(f'Error al cargar el modelo: {str(e)}')


if __name__ == "__main__":
    ejemplo_uso()