// cache-github-mcp.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Clase para gestionar el cacheo de recursos desde GitHub
 */
class GitHubModelCache {
  /**
   * Constructor de la clase de caché
   * @param {Object} options - Opciones de configuración
   * @param {string} options.cacheDir - Directorio donde se almacenará la caché
   * @param {number} options.maxAge - Tiempo máximo de vida de la caché en milisegundos (por defecto: 24 horas)
   */
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache');
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 horas por defecto
    
    // Crear directorio de caché si no existe
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Genera un nombre de archivo único basado en la URL
   * @param {string} url - URL del recurso a cachear
   * @returns {string} - Nombre del archivo de caché
   */
  _getCacheFilename(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Guarda metadatos del archivo cacheado
   * @param {string} cacheFile - Ruta del archivo de caché
   * @param {Object} metadata - Metadatos a guardar
   */
  _saveMetadata(cacheFile, metadata) {
    const metaFile = `${cacheFile}.meta`;
    fs.writeFileSync(metaFile, JSON.stringify({
      url: metadata.url,
      timestamp: Date.now(),
      etag: metadata.etag,
      lastModified: metadata.lastModified
    }));
  }

  /**
   * Obtiene los metadatos de un archivo cacheado
   * @param {string} cacheFile - Ruta del archivo de caché
   * @returns {Object|null} - Metadatos o null si no existen
   */
  _getMetadata(cacheFile) {
    const metaFile = `${cacheFile}.meta`;
    if (fs.existsSync(metaFile)) {
      return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    }
    return null;
  }

  /**
   * Verifica si un archivo de caché es válido
   * @param {string} cacheFile - Ruta del archivo de caché
   * @returns {boolean} - true si el archivo está en caché y es válido
   */
  _isCacheValid(cacheFile) {
    if (!fs.existsSync(cacheFile)) return false;

    const metadata = this._getMetadata(cacheFile);
    if (!metadata) return false;

    const age = Date.now() - metadata.timestamp;
    return age < this.maxAge;
  }

  /**
   * Obtiene un modelo desde GitHub con soporte para caché
   * @param {string} url - URL del modelo en GitHub
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - El modelo cargado
   */
  async getModel(url, options = {}) {
    const cacheFile = this._getCacheFilename(url);
    
    // Si existe caché válida, usar la versión cacheada
    if (this._isCacheValid(cacheFile)) {
      console.log(`[Cache] Usando versión cacheada de ${url}`);
      const modelData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return modelData;
    }

    console.log(`[Cache] Descargando modelo desde ${url}`);
    
    // Preparar headers para soporte condicional
    const headers = {};
    const metadata = this._getMetadata(cacheFile);
    
    if (metadata) {
      if (metadata.etag) headers['If-None-Match'] = metadata.etag;
      if (metadata.lastModified) headers['If-Modified-Since'] = metadata.lastModified;
    }

    try {
      // Descargar el modelo
      const response = await axios.get(url, { 
        headers,
        validateStatus: status => (status >= 200 && status < 300) || status === 304
      });
      
      // Si el servidor devuelve 304 Not Modified, usar la versión cacheada
      if (response.status === 304 && fs.existsSync(cacheFile)) {
        console.log(`[Cache] El modelo no ha cambiado, usando versión cacheada`);
        this._saveMetadata(cacheFile, {
          url,
          etag: response.headers.etag,
          lastModified: response.headers['last-modified']
        });
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
      
      // Guardar el nuevo modelo en caché
      fs.writeFileSync(cacheFile, JSON.stringify(response.data));
      
      // Guardar metadatos para validación futura
      this._saveMetadata(cacheFile, {
        url,
        etag: response.headers.etag,
        lastModified: response.headers['last-modified']
      });
      
      return response.data;
    } catch (error) {
      console.error(`[Cache] Error al descargar el modelo: ${error.message}`);
      
      // Si hay una versión cacheada, usarla como fallback
      if (fs.existsSync(cacheFile)) {
        console.log(`[Cache] Usando versión cacheada como fallback`);
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
      
      throw error;
    }
  }

  /**
   * Limpia archivos de caché antiguos
   */
  cleanOldCache() {
    const files = fs.readdirSync(this.cacheDir);
    
    files.forEach(file => {
      if (file.endsWith('.meta')) {
        const metaPath = path.join(this.cacheDir, file);
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        
        const age = Date.now() - metadata.timestamp;
        if (age > this.maxAge) {
          const cacheFile = metaPath.replace('.meta', '');
          if (fs.existsSync(cacheFile)) {
            fs.unlinkSync(cacheFile);
          }
          fs.unlinkSync(metaPath);
          console.log(`[Cache] Eliminado archivo antiguo: ${file}`);
        }
      }
    });
  }
}

// Ejemplo de uso
async function ejemploUso() {
  const modelCache = new GitHubModelCache({
    cacheDir: './model-cache',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });

  try {
    // URL ejemplo de un modelo en GitHub (raw)
    const modelUrl = 'https://raw.githubusercontent.com/usuario/repo/main/modelo.json';
    
    // Cargar el modelo (desde caché o desde GitHub)
    const model = await modelCache.getModel(modelUrl);
    
    console.log('Modelo cargado correctamente');
    // Aquí utilizarías el modelo
    
    // Limpiar caché antigua periódicamente
    modelCache.cleanOldCache();
  } catch (error) {
    console.error('Error al cargar el modelo:', error);
  }
}

// Ejecutar el ejemplo
ejemploUso();

module.exports = GitHubModelCache;