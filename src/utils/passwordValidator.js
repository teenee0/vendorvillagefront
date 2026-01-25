/**
 * Валидатор паролей для фронтенда
 * Проверяет пароли на простоту и распространенность
 */

// Список самых распространенных паролей (топ 1000)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '1234', 'qwerty', '12345',
  'dragon', 'baseball', 'football', 'letmein', 'monkey', 'abc123',
  'mustang', 'michael', 'shadow', 'master', 'jennifer', '111111',
  'jordan', 'superman', 'harley', '1234567', 'hunter', 'trustno1',
  'ranger', 'buster', 'thomas', 'tigger', 'robert', 'soccer',
  'batman', 'test', 'pass', 'killer', 'hockey', 'george', 'charlie',
  'andrew', 'michelle', 'love', 'sunshine', 'jessica', 'pepper',
  'daniel', 'access', '123456789', '654321', 'joshua', 'maggie',
  'starwars', 'silver', 'william', 'dallas', 'yankees', '123123',
  'ashley', '666666', 'hello', 'amanda', 'orange', 'freedom',
  'computer', 'sexy', 'thunder', 'nicole', 'ginger', 'heather',
  'hammer', 'summer', 'corvette', 'taylor', 'austin', '1111',
  'merlin', 'matthew', '121212', 'golfer', 'cheese', 'princess',
  'martin', 'chelsea', 'patrick', 'richard', 'diamond', 'yellow',
  'bigdog', 'secret', 'asdfgh', 'sparky', 'cowboy', 'camaro',
  'anthony', 'matrix', 'falcon', 'iloveyou', 'bailey', 'guitar',
  'jackson', 'purple', 'scooter', 'phoenix', 'aaaaaa', 'morgan',
  'tigers', 'porsche', 'mickey', 'maverick', 'cookie', 'nascar',
  'peanut', 'justin', '131313', 'money', 'samantha', 'steelers',
  'joseph', 'snoopy', 'boomer', 'whatever', 'iceman', 'smokey',
  'gateway', 'dakota', 'cowboys', 'eagles', 'chicken', 'black',
  'zxcvbn', 'please', 'andrea', 'ferrari', 'knight', 'hardcore',
  'melissa', 'compaq', 'coffee', 'johnny', 'bulldog', 'xxxxxx',
  'welcome', 'james', 'player', 'ncc1701', 'wizard', 'scooby',
  'charles', 'junior', 'internet', 'mike', 'brandy', 'tennis',
  'banana', 'monster', 'spider', 'lakers', 'miller', 'rabbit',
  'enter', 'mercedes', 'brandon', 'steven', 'fender', 'john',
  'yamaha', 'diablo', 'chris', 'boston', 'tiger', 'marine',
  'chicago', 'rangers', 'gandalf', 'winter', 'barney', 'edward',
  'raiders', 'badboy', 'bigdaddy', 'johnson', 'chester', 'london',
  'midnight', 'blue', 'fishing', '000000', 'hannah', 'slayer',
  '11111111', 'rachel', 'redsox', 'asdf', 'marlboro', 'panther',
  'zxcvbnm', 'arsenal', 'oliver', 'qazwsx', 'mother', 'victoria',
  '7777777', 'jasper', 'angel', 'david', 'winner', 'crystal',
  'golden', 'butthead', 'viking', 'jack', 'shannon', 'murphy',
  'angels', 'prince', 'cameron', 'girls', 'madison', 'wilson',
  'carlos', 'hooters', 'willie', 'startrek', 'captain', 'maddog',
  'jasmine', 'butter', 'booger', 'angela', 'golf', 'lauren',
  'rocket', 'tiffany', 'theman', 'dennis', 'liverpoo', 'flower',
  'forever', 'green', 'jackie', 'muffin', 'turtle', 'sophie',
  'danielle', 'redskins', 'toyota', 'jason', 'sierra', 'winston',
  'debbie', 'giants', 'packers', 'newyork', 'jeremy', 'casper',
  'bubba', '112233', 'sandra', 'lovers', 'mountain', 'united',
  'cooper', 'driver', 'tucker', 'helpme', 'pookie', 'lucky',
  'maxwell', '8675309', 'bear', 'gators', '5150', '222222',
  'jaguar', 'monica', 'fred', 'happy', 'hotdog', 'gemini', 'lover',
  'xxxxxxxx', '777777', 'canada', 'nathan', 'victor', 'florida',
  '88888888', 'nicholas', 'rosebud', 'metallic', 'doctor', 'trouble',
  'success', 'stupid', 'tomcat', 'warrior', 'peaches', 'apples',
  'fish', 'qwertyui', 'magic', 'buddy', 'dolphins', 'rainbow',
  'gunner', '987654', 'freddy', 'alexis', 'braves', '2112',
  '1212', 'cocacola', 'xavier', 'dolphin', 'testing', 'bond007',
  'member', 'calvin', 'voodoo', '7777', 'samson', 'alex', 'apollo',
  'fire', 'tester', 'walter', 'beavis', 'voyager', 'peter',
  'bonnie', 'rush2112', 'beer', 'apple', 'scorpio', 'jonathan',
  'skippy', 'sydney', 'scott', 'red123', 'power', 'gordon', 'travis',
  'beaver', 'star', 'jackass', 'flyers', 'boobs', '232323', 'zzzzzz',
  'steve', 'rebecca', 'scorpion', 'doggie', 'legend', 'ou812',
  'yankee', 'blazer', 'bill', 'runner', 'birdie', '555555',
  'parker', 'topgun', 'asdfasdf', 'heaven', 'viper', 'animal', '2222',
  'bigboy', '4444', 'arthur', 'baby', 'private', 'godzilla', 'donald',
  'williams', 'lifehack', 'phantom', 'dave', 'rock', 'august', 'sammy',
  'cool', 'brian', 'platinum', 'jake', 'bronco', 'paul', 'mark', 'frank',
  'copper', 'billy', 'garfield', 'willow', 'little', 'carter',
  'albert', '69696969', 'kitten', 'super', 'jordan23', 'eagle1',
  'shelby', 'america', '11111', 'jessie', 'house', 'free', '123321',
  'chevy', 'white', 'broncos', 'surfer', 'nissan', '999999',
  'saturn', 'airborne', 'elephant', 'marvin', 'action', 'adidas',
  'qwert', 'kevin', '1313', 'explorer', 'walker', 'police',
  'december', 'benjamin', 'wolf', 'sweet', 'therock', 'king', 'online',
  'brooklyn', 'teresa', 'cricket', 'sharon', 'dexter', 'racing',
  'gregory', '0000', 'teens', 'redwings', 'dreams', 'michigan',
  'magnum', '87654321', 'nothing', 'donkey', 'trinity', 'digital',
  '333333', 'stella', 'cartman', 'guinness', '123abc', 'speedy',
  'buffalo', 'kitty', 'eagle', 'einstein', 'kelly', 'nelson',
  'nirvana', 'vampire', 'xxxx', 'playboy', 'louise', 'pumpkin',
  'snowball', 'test123', 'girl', 'sucker', 'mexico', 'beatles',
  'fantasy', 'ford', 'gibson', 'celtic', 'marcus', 'cherry', 'cassie',
  '888888', 'natasha', 'sniper', 'chance', 'genesis', 'hotrod', 'reddog',
  'alexande', 'college', 'jester', 'passw0rd', 'smith', 'lasvegas',
  'carmen', 'slipknot', '3333', 'death', 'kimberly', '1q2w3e',
  'eclipse', '1q2w3e4r', 'stanley', 'samuel', 'drummer', 'homer',
  'montana', 'music', 'aaaa', 'spencer', 'jimmy', 'carolina',
  'colorado', 'creative', 'hello1', 'rocky', 'goober', 'friday',
  'scotty', 'abcdef', 'bubbles', 'hawaii', 'fluffy', 'mine', 'stephen',
  'horses', 'thumper', '5555', 'darkness', 'asdfghjk', 'pamela',
  'buddha', 'vanessa', 'sandman', 'naughty', 'douglas', 'hottie',
  'mandy', 'denise', 'charlie1', 'pookie1', 'qwer1234', '1234qwer',
  'qwerty123', 'qwerty1', 'password1', 'password12', 'password123',
  'qwerty12', 'qwerty1234', '1234567890', '123456789a', 'a123456',
  '123456a', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'qwertyui',
  'asdfghjk', 'qwerty12345', 'qwertyuiop123', 'asdfghjkl123',
  'zxcvbnm123', 'qwerty123456', 'asdfgh123456', 'zxcvbn123456',
  'qwerty1234567', 'asdfgh1234567', 'zxcvbn1234567', 'qwerty12345678',
  'asdfgh12345678', 'zxcvbn12345678', 'qwerty123456789',
  'asdfgh123456789', 'zxcvbn123456789', 'qwerty1234567890',
  'asdfgh1234567890', 'zxcvbn1234567890', 'qwertyuiopasdfghjkl',
  'asdfghjklzxcvbnm', 'qwertyuiopasdfghjklzxcvbnm',
  'qwertyuiop123456', 'asdfghjkl123456', 'zxcvbnm123456',
  'qwertyuiop1234567', 'asdfghjkl1234567', 'zxcvbnm1234567',
  'qwertyuiop12345678', 'asdfghjkl12345678', 'zxcvbnm12345678',
  'qwertyuiop123456789', 'asdfghjkl123456789', 'zxcvbnm123456789',
  'qwertyuiop1234567890', 'asdfghjkl1234567890', 'zxcvbnm1234567890',
].map(p => p.toLowerCase()));

/**
 * Проверяет, является ли пароль распространенным
 */
export const isCommonPassword = (password) => {
  if (!password) return false;
  return COMMON_PASSWORDS.has(password.toLowerCase());
};

/**
 * Проверяет, является ли пароль простым (последовательности, повторения)
 */
export const isSimplePassword = (password) => {
  if (!password) return false;
  
  const passwordLower = password.toLowerCase();
  
  // Проверка на последовательности
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    '0123456789',
    '9876543210',
    'qwertyuiopasdfghjklzxcvbnm',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
    '0987654321',
  ];
  
  for (const seq of sequences) {
    if (passwordLower.includes(seq) || passwordLower.includes(seq.split('').reverse().join(''))) {
      return true;
    }
  }
  
  // Проверка на повторяющиеся символы (более 3 подряд)
  if (password.length >= 4) {
    for (let i = 0; i < password.length - 3; i++) {
      if (password[i] === password[i+1] && password[i] === password[i+2] && password[i] === password[i+3]) {
        return true;
      }
    }
  }
  
  // Проверка на только цифры
  if (password.match(/^\d+$/)) {
    return true;
  }
  
  // Проверка на только буквы
  if (password.match(/^[a-zA-Z]+$/)) {
    return true;
  }
  
  return false;
};

/**
 * Валидирует пароль и возвращает сообщение об ошибке или null
 */
export const validatePassword = (password) => {
  if (!password) {
    return 'Пароль обязателен';
  }
  
  // Проверка на минимум 8 символов
  if (password.length < 8) {
    return 'Пароль должен быть не менее 8 символов';
  }
  
  // Проверка, что пароль состоит только из английских букв, цифр и допустимых символов
  // Разрешаем английские буквы (a-z, A-Z), цифры (0-9) и основные спецсимволы
  if (!password.match(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/)) {
    return 'Пароль должен состоять только из английских букв, цифр и допустимых символов.';
  }
  
  // Проверка на наличие заглавных букв
  if (!password.match(/[A-Z]/)) {
    return 'Пароль должен содержать хотя бы одну заглавную букву.';
  }
  
  // Проверка на наличие строчных букв
  if (!password.match(/[a-z]/)) {
    return 'Пароль должен содержать хотя бы одну строчную букву.';
  }
  
  if (isCommonPassword(password)) {
    return 'Введённый пароль слишком широко распространён.';
  }
  
  if (isSimplePassword(password)) {
    if (password.match(/^\d+$/)) {
      return 'Пароль не может состоять только из цифр.';
    }
    if (password.match(/^[a-zA-Z]+$/)) {
      return 'Пароль не может состоять только из букв.';
    }
    // Проверка на последовательности
    const passwordLower = password.toLowerCase();
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba',
      '0123456789',
      '9876543210',
      'qwertyuiopasdfghjklzxcvbnm',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
      '1234567890',
      '0987654321',
    ];
    for (const seq of sequences) {
      if (passwordLower.includes(seq) || passwordLower.includes(seq.split('').reverse().join(''))) {
        return 'Пароль содержит простую последовательность символов.';
      }
    }
    // Проверка на повторения
    if (password.length >= 4) {
      for (let i = 0; i < password.length - 3; i++) {
        if (password[i] === password[i+1] && password[i] === password[i+2] && password[i] === password[i+3]) {
          return 'Пароль содержит повторяющиеся символы.';
        }
      }
    }
    return 'Пароль слишком простой.';
  }
  
  return null;
};
