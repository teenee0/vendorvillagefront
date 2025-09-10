#!/usr/bin/env node

/**
 * Скрипт для быстрого переключения между окружениями
 * Использование: node scripts/switch-env.js [dev|prod]
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/config/environment.js');

const environments = {
  dev: 'development',
  prod: 'production'
};

const targetEnv = process.argv[2];

if (!targetEnv || !environments[targetEnv]) {
  console.log('Использование: node scripts/switch-env.js [dev|prod]');
  console.log('  dev  - переключиться на development');
  console.log('  prod - переключиться на production');
  process.exit(1);
}

const targetEnvironment = environments[targetEnv];

try {
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Заменяем определение окружения
  const envRegex = /const getEnvironment = \(\) => \{[\s\S]*?return '([^']+)';/;
  const match = configContent.match(envRegex);
  
  if (match) {
    const currentEnv = match[1];
    configContent = configContent.replace(
      envRegex,
      `const getEnvironment = () => {
  // Проверяем переменные окружения Vite
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV;
  }
  
  // Проверяем режим Vite
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  if (import.meta.env.PROD) {
    return 'production';
  }
  
  // По умолчанию ${targetEnvironment}
  return '${targetEnvironment}';`
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log(`✅ Окружение переключено на: ${targetEnvironment}`);
    console.log(`📝 Файл обновлен: ${configPath}`);
  } else {
    console.error('❌ Не удалось найти функцию getEnvironment в конфигурации');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Ошибка при обновлении конфигурации:', error.message);
  process.exit(1);
}
