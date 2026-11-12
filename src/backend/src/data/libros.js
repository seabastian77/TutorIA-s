// Estante de clásicos de dominio público: cada capítulo trae los hechos que la IA debe contar, en orden
// Todos los autores murieron hace más de 80 años, así que las obras son de dominio público en Colombia

const LIBROS = [
  {
    id: "house-of-usher",
    titulo: "The Fall of the House of Usher",
    tituloEs: "La caída de la casa Usher",
    autor: "Edgar Allan Poe",
    anio: 1839,
    genero: "Horror",
    ambiente: "foggy old mansion at night",
    capitulos: [
      {
        titulo: "The Letter",
        tituloEs: "La carta",
        hechos: "The narrator gets an urgent letter from his childhood friend Roderick Usher, who says he is ill and needs company. On a dark, gray autumn day the narrator rides to the old Usher house. The house looks sad and dead; dead trees stand around it and a dark lake lies in front of it. He notices a thin crack that runs from the roof down the wall into the lake.",
      },
      {
        titulo: "Roderick",
        tituloEs: "Roderick",
        hechos: "Inside, Roderick is very pale and nervous. Light hurts his eyes and most sounds hurt his ears; only some music is bearable. He believes the old house itself has a strange power over his mind. His twin sister Madeline is very ill and walks past like a ghost without seeing them. For days the narrator tries to cheer him up with books, music and painting.",
      },
      {
        titulo: "Madeline",
        tituloEs: "Madeline",
        hechos: "One evening Roderick says that Madeline has died. Because doctors might be curious about her illness, they put her coffin in a vault deep under the house for two weeks. The narrator sees a soft color on her cheeks and a faint smile on her lips. After that, Roderick wanders through the house, more afraid every day, as if he is listening for something.",
      },
      {
        titulo: "The Storm",
        tituloEs: "La tormenta",
        hechos: "On a wild, stormy night Roderick cannot sleep, so the narrator reads him an old adventure story. Strange sounds of breaking wood and metal in the house match the sounds in the story. Roderick cries that they put Madeline in the tomb alive and that she is standing outside the door. The door opens: Madeline is there, pale and weak, and she falls on her brother; both of them die. The narrator runs outside, the crack grows wide, and the whole house falls into the dark lake.",
      },
    ],
  },
  {
    id: "tell-tale-heart",
    titulo: "The Tell-Tale Heart",
    tituloEs: "El corazón delator",
    autor: "Edgar Allan Poe",
    anio: 1843,
    genero: "Horror",
    ambiente: "dark old room candle light",
    capitulos: [
      {
        titulo: "The Eye",
        tituloEs: "El ojo",
        hechos: "The narrator speaks to us and says again and again that he is not mad. He lives with an old man who has always been kind to him. He does not want the old man's money; he hates only one thing: the old man's pale blue eye, which looks like the eye of a vulture. He decides to get rid of that eye forever.",
      },
      {
        titulo: "Seven Nights",
        tituloEs: "Siete noches",
        hechos: "Every night at midnight, for seven nights, the narrator very slowly opens the old man's door. He puts his head in and opens his lantern just a little, so one thin ray of light falls on the old man's face. But the eye is always closed, so he cannot do it. On the eighth night his hand slips, the old man wakes up and sits in the dark, afraid, listening.",
      },
      {
        titulo: "The Heartbeat",
        tituloEs: "El latido",
        hechos: "The narrator waits for a long time in the dark, then opens the lantern; the ray falls on the open eye. He hears a low, quick sound, like a watch wrapped in cotton: the old man's heart beating louder and louder. He is afraid a neighbor will hear it, so he attacks, and the old man dies. Calmly, he hides everything under the wooden floor, so well that no eye could see anything.",
      },
      {
        titulo: "The Police",
        tituloEs: "La policía",
        hechos: "At four in the morning three police officers knock: a neighbor heard a scream. The narrator smiles, invites them in and says the old man is away in the country. He even puts chairs in the old man's room and sits right above the hiding place. Soon he hears a low beating sound that grows louder and louder. He is sure the officers can hear it and are only pretending, so he screams that he did it and tells them to tear up the floor.",
      },
    ],
  },
  {
    id: "red-headed-league",
    titulo: "Sherlock Holmes: The Red-Headed League",
    tituloEs: "Sherlock Holmes: La Liga de los Pelirrojos",
    autor: "Arthur Conan Doyle",
    anio: 1891,
    genero: "Mystery",
    ambiente: "foggy london street gas lamps",
    capitulos: [
      {
        titulo: "A Strange Advertisement",
        tituloEs: "Un anuncio extraño",
        hechos: "Doctor Watson visits his friend Sherlock Holmes, who is talking with Mr. Jabez Wilson, a shopkeeper with bright red hair. Holmes surprises them by guessing things about Wilson's life just by looking at him. Wilson shows a newspaper advertisement: the League of Red-Headed Men will pay four pounds a week to a red-haired man for very easy work. His young assistant, Vincent Spaulding, told him to go and apply.",
      },
      {
        titulo: "The Easiest Job in London",
        tituloEs: "El trabajo más fácil de Londres",
        hechos: "Hundreds of red-haired men wait in the street, but Wilson gets the job. Every day from ten to two he sits in an office and copies the encyclopedia by hand, and he must never leave the room. He is paid well for eight weeks. Then one morning he finds a small card on the locked door: The Red-Headed League is dissolved. Nobody knows where the League has gone, so Wilson asks Holmes for help.",
      },
      {
        titulo: "The Clues",
        tituloEs: "Las pistas",
        hechos: "Holmes asks about the assistant: he works for half pay, he loves photography and he often goes down into the cellar. Holmes visits Wilson's shop, knocks on the street with his walking stick and looks at the assistant's trousers, which are dirty and worn at the knees. Behind the shop he sees a big bank. He understands that the job was a trick to keep Wilson out of his own house, and he tells Watson to bring his gun that night.",
      },
      {
        titulo: "Under the Bank",
        tituloEs: "Bajo el banco",
        hechos: "At night Holmes, Watson, a police inspector and the bank director wait in the dark cellar of the bank, next to boxes full of French gold. After a long silence a stone in the floor moves and a man climbs out of a tunnel: it is the assistant, really the famous criminal John Clay. Holmes catches him before he can escape. Later Holmes explains that the assistant dug a tunnel from Wilson's cellar to the bank while Wilson was busy copying the encyclopedia.",
      },
    ],
  },
  {
    id: "treasure-island",
    titulo: "Treasure Island",
    tituloEs: "La isla del tesoro",
    autor: "Robert Louis Stevenson",
    anio: 1883,
    genero: "Adventure",
    ambiente: "sailing ship ocean waves",
    capitulos: [
      {
        titulo: "The Old Sea Captain",
        tituloEs: "El viejo capitán",
        hechos: "Young Jim Hawkins helps his parents at their inn, the Admiral Benbow, by the sea. An old sailor called Billy Bones comes to stay; he sings pirate songs and watches the sea all day, afraid of a sailor with one leg. A blind pirate brings him a black spot, a pirate warning, and Billy dies of shock. In his sea chest Jim finds a map of an island with a red cross on it: Captain Flint's treasure.",
      },
      {
        titulo: "The Hispaniola",
        tituloEs: "La Hispaniola",
        hechos: "Jim shows the map to Doctor Livesey and Squire Trelawney. The squire buys a ship, the Hispaniola, and hires Captain Smollett and a crew. The friendly cook, Long John Silver, has only one leg and a parrot that shouts \"Pieces of eight!\" Jim likes him very much, and they sail away to find the treasure.",
      },
      {
        titulo: "The Apple Barrel",
        tituloEs: "El barril de manzanas",
        hechos: "One night Jim climbs into a big apple barrel to get an apple. From inside, he hears Silver talking with other sailors: they are pirates, and they plan to take the ship and the treasure once the map leads them to it. Jim secretly tells the captain, the doctor and the squire. When they arrive at the island, the pirates go ashore and the fight begins; Jim's friends defend an old wooden fort.",
      },
      {
        titulo: "Ben Gunn's Gold",
        tituloEs: "El oro de Ben Gunn",
        hechos: "On the island Jim meets Ben Gunn, a sailor who was left there alone three years ago. Silver and the pirates follow the map and dig at the place of the red cross, but the hole is empty. Ben Gunn found the treasure long ago and hid it in his cave. Jim and his friends carry the gold to the ship and sail home, and Silver escapes at a port with a small bag of money.",
      },
    ],
  },
  {
    id: "jungle-book",
    titulo: "The Jungle Book: Mowgli",
    tituloEs: "El libro de la selva: Mowgli",
    autor: "Rudyard Kipling",
    anio: 1894,
    genero: "Adventure",
    ambiente: "jungle forest rain",
    capitulos: [
      {
        titulo: "The Man-Cub",
        tituloEs: "El cachorro humano",
        hechos: "One evening in the jungle of India, a little baby boy walks into a wolf family's cave, laughing. The tiger Shere Khan, who is lame, arrives and says the baby belongs to him. Mother Wolf stands up to him and says the baby is hers now. She calls him Mowgli, the little frog, and decides to raise him with her cubs.",
      },
      {
        titulo: "The Council Rock",
        tituloEs: "La Roca del Consejo",
        hechos: "At the Council Rock, the wolf pack must decide if the man-cub can stay. Baloo, the old brown bear who teaches the young wolves the Law of the Jungle, speaks for Mowgli. Bagheera, the black panther, buys Mowgli's life with a freshly killed bull. Mowgli grows up with the wolves, and Baloo teaches him the words that all jungle animals understand.",
      },
      {
        titulo: "The Monkey People",
        tituloEs: "El pueblo de los monos",
        hechos: "The Bandar-log, the noisy monkeys who have no law, carry Mowgli away through the treetops to the Cold Lairs, an old ruined city. Mowgli asks a kite bird to tell Baloo and Bagheera where he is. His friends ask Kaa, the huge python, for help. In the moonlight Kaa scares the monkeys away and they save Mowgli.",
      },
      {
        titulo: "The Red Flower",
        tituloEs: "La flor roja",
        hechos: "Years later Shere Khan has made many young wolves turn against Mowgli. Bagheera tells him to bring the Red Flower, fire, from the village of men. At the Council Rock Mowgli waves a burning branch, scares Shere Khan and the wolves who want him gone, and protects old Akela, the leader. Then, crying for the first time, he says goodbye to his wolf family and walks down the hill to live among men, promising to come back.",
      },
    ],
  },
  {
    id: "alice-in-wonderland",
    titulo: "Alice's Adventures in Wonderland",
    tituloEs: "Alicia en el país de las maravillas",
    autor: "Lewis Carroll",
    anio: 1865,
    genero: "Fantasy",
    ambiente: "garden flowers sunny afternoon",
    capitulos: [
      {
        titulo: "Down the Rabbit Hole",
        tituloEs: "Por la madriguera del conejo",
        hechos: "Alice is bored, sitting by the river with her sister. A White Rabbit in a waistcoat runs past, takes a watch out of his pocket and says, \"Oh dear! I shall be late!\" Alice follows him into a rabbit hole and falls down, down, very slowly, past shelves and cupboards. She lands in a long hall full of locked doors and finds a tiny golden key.",
      },
      {
        titulo: "Drink Me",
        tituloEs: "Bébeme",
        hechos: "The key opens a tiny door to a beautiful garden, but Alice is too big to go through. She drinks from a bottle that says DRINK ME and becomes very small, but she has left the key on the table. Then she eats a cake that says EAT ME and grows so tall that her head hits the ceiling. She cries big tears, makes a pool, shrinks again and swims in her own tears with a mouse.",
      },
      {
        titulo: "A Mad Tea Party",
        tituloEs: "Una merienda de locos",
        hechos: "In a forest Alice meets the Cheshire Cat, who has a huge smile and slowly disappears until only the smile is left. The Cat says everyone there is mad. Alice finds the March Hare and the Hatter having tea with a sleepy Dormouse. For them it is always six o'clock, always tea time, and they ask riddles with no answers, so Alice walks away annoyed.",
      },
      {
        titulo: "The Queen's Croquet and the Trial",
        tituloEs: "El críquet de la Reina y el juicio",
        hechos: "At last Alice enters the garden, where playing cards are painting white roses red. The Queen of Hearts plays croquet with flamingos and hedgehogs and shouts \"Off with their heads!\" at everyone. At a silly trial about some stolen tarts, Alice starts to grow big again. When the Queen orders her head off, Alice says, \"You're nothing but a pack of cards!\" The cards fly at her, and she wakes up by the river: it was all a wonderful dream.",
      },
    ],
  },
  {
    id: "peter-pan",
    titulo: "Peter Pan",
    tituloEs: "Peter Pan",
    autor: "J. M. Barrie",
    anio: 1911,
    genero: "Fantasy",
    ambiente: "night sky stars over city",
    capitulos: [
      {
        titulo: "The Lost Shadow",
        tituloEs: "La sombra perdida",
        hechos: "In London, Wendy, John and Michael Darling live with their parents and Nana, a big dog who works as their nurse. One night a boy flies in through the window looking for his shadow, which he lost there. His name is Peter Pan, and he never grows up. Wendy sews the shadow back on his feet, and Peter is so happy that he crows like a rooster.",
      },
      {
        titulo: "Second Star to the Right",
        tituloEs: "La segunda estrella a la derecha",
        hechos: "Peter tells Wendy about the Lost Boys in Neverland, who have no mother to tell them stories. He teaches the three children to fly with happy thoughts and a little fairy dust from his fairy, Tinker Bell. They fly out of the window over the roofs of London, toward the second star to the right and straight on till morning.",
      },
      {
        titulo: "Neverland",
        tituloEs: "El País de Nunca Jamás",
        hechos: "In Neverland, Wendy becomes a mother to the Lost Boys in their home under the ground. They see mermaids in the lagoon and have many adventures. The pirate Captain Hook, who has an iron hook instead of a hand, wants revenge on Peter. Hook is afraid of only one thing: a crocodile that once ate his hand and also swallowed a clock, so it goes tick-tock wherever it goes.",
      },
      {
        titulo: "Hook or Me",
        tituloEs: "Garfio o yo",
        hechos: "The pirates capture Wendy and the boys and take them to their ship. Peter arrives, imitating the crocodile's tick-tock, and fights Hook on the deck. In the end Hook falls into the sea, where the crocodile is waiting for him. The children fly home to their happy parents, and the Lost Boys are adopted too, but Peter stays in Neverland because he never wants to grow up.",
      },
    ],
  },
  {
    id: "aesops-fables",
    titulo: "Aesop's Fables",
    tituloEs: "Fábulas de Esopo",
    autor: "Aesop",
    anio: null,
    genero: "Fables",
    ambiente: "countryside field morning",
    capitulos: [
      {
        titulo: "The Tortoise and the Hare",
        tituloEs: "La tortuga y la liebre",
        hechos: "A hare laughs at a tortoise because she is so slow. The tortoise calmly says she can beat him in a race. The hare runs far ahead and, sure of winning, lies down to sleep under a tree. The tortoise walks slowly and never stops. When the hare wakes up, the tortoise is already crossing the finish line. Moral: slow and steady wins the race.",
      },
      {
        titulo: "The Fox and the Grapes",
        tituloEs: "La zorra y las uvas",
        hechos: "A hungry fox sees some beautiful purple grapes hanging high on a vine. He jumps and jumps, but he cannot reach them. At last he gives up and walks away with his nose in the air, saying the grapes are probably sour anyway. Moral: it is easy to say bad things about what we cannot have.",
      },
      {
        titulo: "The Lion and the Mouse",
        tituloEs: "El león y el ratón",
        hechos: "A little mouse runs over a sleeping lion and wakes him up. The lion catches the mouse, but the mouse begs to be free and promises to help him one day. The lion laughs and lets him go. Later, hunters catch the lion in a strong net. The mouse hears him roar, comes and bites through the ropes until the lion is free. Moral: little friends can be great friends.",
      },
      {
        titulo: "The Boy Who Cried Wolf",
        tituloEs: "El pastorcito mentiroso",
        hechos: "A shepherd boy is bored watching the sheep near a village. As a joke he shouts \"Wolf! Wolf!\" and the villagers run to help, but there is no wolf, and he laughs at them. He does it again, and again they come for nothing. Then a real wolf comes. The boy shouts for help, but nobody believes him now, and the wolf scares away the sheep. Moral: people do not believe a liar, even when he tells the truth.",
      },
    ],
  },
];

/** Busca un libro por su identificador. */
function obtenerLibro(id) {
  return LIBROS.find((libro) => libro.id === id) || null;
}

module.exports = { LIBROS, obtenerLibro };
