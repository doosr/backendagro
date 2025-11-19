/**
 * Script de débogage pour vérifier les exports du contrôleur
 * Exécuter avec: node debug-exports.js
 */

console.log('🔍 Vérification des exports du imageController...\n');

try {
  const imageController = require('./src/controllers/imageController');
  
  console.log('✅ Module chargé avec succès\n');
  console.log('📋 Fonctions exportées:');
  console.log('─────────────────────────────────────');
  
  const requiredFunctions = [
    'uploadManualImage',
    'uploadAutoImage',
    'getImages',
    'getImageById',
    'deleteImage',
    'reanalyzeImage',
    'checkAIServiceStatus',
    'getImageStats'
  ];
  
  let allPresent = true;
  
  requiredFunctions.forEach(funcName => {
    const exists = typeof imageController[funcName] === 'function';
    const icon = exists ? '✅' : '❌';
    console.log(`${icon} ${funcName}: ${exists ? 'PRESENT' : 'MANQUANT'}`);
    
    if (!exists) {
      allPresent = false;
    }
  });
  
  console.log('─────────────────────────────────────\n');
  
  if (allPresent) {
    console.log('✅ Tous les exports sont présents!\n');
  } else {
    console.log('❌ Certains exports sont manquants!\n');
    console.log('💡 Vérifiez que toutes les fonctions sont bien exportées:');
    console.log('   exports.nomDeLaFonction = async (req, res) => { ... }\n');
  }
  
  // Afficher tous les exports disponibles
  console.log('📦 Tous les exports disponibles:');
  console.log('─────────────────────────────────────');
  Object.keys(imageController).forEach(key => {
    console.log(`   - ${key} (${typeof imageController[key]})`);
  });
  
} catch (error) {
  console.error('❌ Erreur lors du chargement du module:');
  console.error(error.message);
  console.error('\n💡 Vérifiez:');
  console.error('   1. Le chemin: ./src/controllers/imageController.js');
  console.error('   2. La syntaxe du fichier (pas d\'erreurs de syntaxe)');
  console.error('   3. Les dépendances sont installées\n');
}