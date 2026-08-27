// Spikeball Elite Official Dataset & Utility Functions
// Source: https://tournaments.spikeball.com/pages/spikeball-elite

export interface EliteTeamEntry {
  year: number;
  division: string;
  teamName: string;
  players: string[];
  rawPlayers: string;
}

export const ELITE_TEAMS: EliteTeamEntry[] = [
  {
    "year": 2024,
    "division": "Open",
    "teamName": "Ultra Instinct",
    "players": [
      "Gabriel Finocchi",
      "Thomas Hamilton"
    ],
    "rawPlayers": "Gabriel Finocchi / Thomas Hamilton"
  },
  {
    "year": 2024,
    "division": "Open",
    "teamName": "Eisenträger/Siemer",
    "players": [
      "Lukas Eisenträger",
      "Paul Siemer"
    ],
    "rawPlayers": "Lukas Eisenträger / Paul Siemer"
  },
  {
    "year": 2024,
    "division": "Open",
    "teamName": "Numb",
    "players": [
      "Paq Clifford",
      "Kieran Rose"
    ],
    "rawPlayers": "Paq Clifford / Kieran Rose"
  },
  {
    "year": 2024,
    "division": "Open",
    "teamName": "J.A.R.V.I.S.",
    "players": [
      "Josh Fragiacomo",
      "Connor Nelson"
    ],
    "rawPlayers": "Josh Fragiacomo / Connor Nelson"
  },
  {
    "year": 2024,
    "division": "Women",
    "teamName": "Nova",
    "players": [
      "Laura Kunzelmann",
      "Inès Paysan"
    ],
    "rawPlayers": "Laura Kunzelmann / Inès Paysan"
  },
  {
    "year": 2024,
    "division": "Women",
    "teamName": "Pierson/Phan",
    "players": [
      "Katheleen Phan",
      "Katie Pierson"
    ],
    "rawPlayers": "Katheleen Phan / Katie Pierson"
  },
  {
    "year": 2024,
    "division": "Women",
    "teamName": "Kickstart",
    "players": [
      "Sarah Allen",
      "Karah Hui"
    ],
    "rawPlayers": "Sarah Allen / Karah Hui"
  },
  {
    "year": 2024,
    "division": "Women",
    "teamName": "Thus Parabatai",
    "players": [
      "Kalin Morgan",
      "Kayla Wu"
    ],
    "rawPlayers": "Kalin Morgan / Kayla Wu-Fleming"
  },
  {
    "year": 2023,
    "division": "Open",
    "teamName": "Rogue",
    "players": [
      "Thomas Hamilton",
      "Ryan Marino"
    ],
    "rawPlayers": "Thomas Hamilton & Ryan Marino"
  },
  {
    "year": 2023,
    "division": "Open",
    "teamName": "Kingdom Come",
    "players": [
      "Matt Cole",
      "Grant Klapwijk"
    ],
    "rawPlayers": "Matt Cole & Grant Klapwijk"
  },
  {
    "year": 2023,
    "division": "Open",
    "teamName": "Insystem",
    "players": [
      "Blake Bosak",
      "Etienne Cote"
    ],
    "rawPlayers": "Blake Bosak & Etienne Cote"
  },
  {
    "year": 2023,
    "division": "Open",
    "teamName": "Critical Hit",
    "players": [
      "Justin Barr",
      "Vincent Mathieu"
    ],
    "rawPlayers": "Justin Barr & Vincent Mathieu"
  },
  {
    "year": 2023,
    "division": "Women",
    "teamName": "TWINZ",
    "players": [
      "Ali Jenki",
      "Olivia Jenki"
    ],
    "rawPlayers": "Ali Jenki & Olivia Jenki"
  },
  {
    "year": 2023,
    "division": "Women",
    "teamName": "Towerful",
    "players": [
      "Laura Kunzelmann",
      "Ronja Lorenz"
    ],
    "rawPlayers": "Laura Kunzelmann & Ronja Lorenz"
  },
  {
    "year": 2023,
    "division": "Women",
    "teamName": "2K.",
    "players": [
      "Kayla Wu",
      "Karah Hui"
    ],
    "rawPlayers": "Kayla Wu Fleming & Karah Hui"
  },
  {
    "year": 2023,
    "division": "Women",
    "teamName": "Tiramisu",
    "players": [
      "Daniela Kadlec",
      "Megan Leybourne"
    ],
    "rawPlayers": "Daniela Kadlec & Megan Leybourne"
  },
  {
    "year": 2022,
    "division": "Open",
    "teamName": "Double Clutch",
    "players": [
      "Fredric Hinkle",
      "Rahul Murthy"
    ],
    "rawPlayers": "Fredric Hinkle & Rahul Murthy"
  },
  {
    "year": 2022,
    "division": "Open",
    "teamName": "Assistive Touch",
    "players": [
      "Buddy Hammon",
      "Clark Marshall"
    ],
    "rawPlayers": "Buddy Hammon & Clark Marshall"
  },
  {
    "year": 2022,
    "division": "Open",
    "teamName": "Finocchi/Model",
    "players": [
      "Gabriel Finocchi",
      "Max Model"
    ],
    "rawPlayers": "Gabriel Finocchi & Max Model"
  },
  {
    "year": 2022,
    "division": "Open",
    "teamName": "Swervie",
    "players": [
      "Kyle Ackermann",
      "Ryan Gross"
    ],
    "rawPlayers": "Kyle Ackermann & Ryan Gross"
  },
  {
    "year": 2022,
    "division": "Women",
    "teamName": "TWINZ",
    "players": [
      "Ali Jenki",
      "Olivia Jenki"
    ],
    "rawPlayers": "Ali Jenki & Olivia Jenki"
  },
  {
    "year": 2022,
    "division": "Women",
    "teamName": "Biggie Smalls",
    "players": [
      "Allie Foster",
      "Katie Pierson"
    ],
    "rawPlayers": "Allie Foster & Katie Pierson"
  },
  {
    "year": 2022,
    "division": "Women",
    "teamName": "KickStart",
    "players": [
      "Sarah Allen",
      "Karah Hui"
    ],
    "rawPlayers": "Sarah Allen & Karah Hui"
  },
  {
    "year": 2022,
    "division": "Women",
    "teamName": "Graham/Rogers",
    "players": [
      "Becca Graham",
      "Alli Rogers"
    ],
    "rawPlayers": "Becca Graham & Alli Rogers"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Double Clutch",
    "players": [
      "Fredric Hinkle",
      "Rahul Murthy"
    ],
    "rawPlayers": "Fredric Hinkle & Rahul Murthy"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Assistive Touch",
    "players": [
      "Buddy Hammon",
      "Clark Marshall"
    ],
    "rawPlayers": "Buddy Hammon & Clark Marshall"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Sloppy Seconds",
    "players": [
      "Travis Core",
      "Gabriel Finocchi"
    ],
    "rawPlayers": "Travis Core & Gabriel Finocchi"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Ritto Boys",
    "players": [
      "Coleman Epperson",
      "Ryder Rivadeneyra"
    ],
    "rawPlayers": "Coleman Epperson & Ryder Rivadeneyra"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Boysterous",
    "players": [
      "Preston Bies",
      "Caleb Heck"
    ],
    "rawPlayers": "Preston Bies & Caleb Heck"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Volley Llamas",
    "players": [
      "Joe Bondi",
      "Will Picone"
    ],
    "rawPlayers": "Joe Bondi & Will Picone"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Knotty",
    "players": [
      "Ryan Fitzgerald",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Ryan Fitzgerald & Jarratt Rouse"
  },
  {
    "year": 2021,
    "division": "Open",
    "teamName": "Outside Smoke",
    "players": [
      "Grant Laughlin",
      "Noah Luskus"
    ],
    "rawPlayers": "Grant Laughlin & Noah Luskus"
  },
  {
    "year": 2021,
    "division": "Women",
    "teamName": "TWINZ",
    "players": [
      "Ali Jenki",
      "Olivia Jenki"
    ],
    "rawPlayers": "Ali Jenki & Olivia Jenki"
  },
  {
    "year": 2021,
    "division": "Women",
    "teamName": "THUS Parabatai",
    "players": [
      "Kalin Miramontes",
      "Kayla Wu"
    ],
    "rawPlayers": "Kalin Miramontes & Kayla Wu"
  },
  {
    "year": 2021,
    "division": "Women",
    "teamName": "Graham/Rogers",
    "players": [
      "Becca Graham",
      "Alli Rogers"
    ],
    "rawPlayers": "Becca Graham & Alli Rogers"
  },
  {
    "year": 2021,
    "division": "Women",
    "teamName": "Zoomies",
    "players": [
      "Allie Foster",
      "Karah Hui"
    ],
    "rawPlayers": "Allie Foster & Karah Hui"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Cisek/Showalter",
    "players": [
      "Tyler Cisek",
      "Peter Jon Showalter"
    ],
    "rawPlayers": "Tyler Cisek & Peter Jon Showalter"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Boysterous",
    "players": [
      "Preston Bies",
      "Caleb Heck"
    ],
    "rawPlayers": "Preston Bies & Caleb Heck"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Mauktega",
    "players": [
      "Troy Mauk",
      "Kenny Ortega"
    ],
    "rawPlayers": "Troy Mauk & Kenny Ortega"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Anchored Li",
    "players": [
      "Ryan Fitzgerald",
      "Anthony Alvino"
    ],
    "rawPlayers": "Ryan Fitzgerald & Anthony Alvino"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Flexual Healing",
    "players": [
      "Travis Core",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Travis Core & Jarratt Rouse"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Trippy Lizard",
    "players": [
      "Clark Marshall",
      "Andrew Card"
    ],
    "rawPlayers": "Clark Marshall & Andrew Card"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Spikers Synonymous",
    "players": [
      "Taylor Church",
      "Tyler Stokes"
    ],
    "rawPlayers": "Taylor Church & Tyler Stokes"
  },
  {
    "year": 2019,
    "division": "Men",
    "teamName": "Shake 'n Bake",
    "players": [
      "David Gonzales",
      "Matt Bohnen"
    ],
    "rawPlayers": "David Gonzales & Matt Bohnen"
  },
  {
    "year": 2019,
    "division": "Women",
    "teamName": "VA/CA",
    "players": [
      "Becca Graham",
      "Jordi Vigna"
    ],
    "rawPlayers": "Becca Graham & Jordi Vigna"
  },
  {
    "year": 2019,
    "division": "Women",
    "teamName": "Boboddy",
    "players": [
      "Olivia Jenki",
      "Tori Farlow"
    ],
    "rawPlayers": "Olivia Jenki & Tori Farlow"
  },
  {
    "year": 2019,
    "division": "Women",
    "teamName": "Trio",
    "players": [
      "Alli Rogers",
      "Ashley Showalter"
    ],
    "rawPlayers": "Alli Rogers & Ashley Gingerich-Showalter"
  },
  {
    "year": 2019,
    "division": "Women",
    "teamName": "Wingin' It",
    "players": [
      "Krista Shrock",
      "Annelise Rohrer"
    ],
    "rawPlayers": "Krista Shrock & Annelise Rohrer"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Cisek/Showalter",
    "players": [
      "Tyler Cisek",
      "Peter Jon Showalter"
    ],
    "rawPlayers": "Tyler Cisek & Peter Jon Showalter"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Wabi Sabi",
    "players": [
      "Preston Bies",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Preston Bies & Jarratt Rouse"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Mauktega",
    "players": [
      "Troy Mauk",
      "Kenny Ortega"
    ],
    "rawPlayers": "Troy Mauk & Kenny Ortega"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Origin Vengeance",
    "players": [
      "Chris Hornacek",
      "Dylan Fogarty"
    ],
    "rawPlayers": "Chris Hornacek & Dylan Fogarty"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "The (717)",
    "players": [
      "Joel Graham",
      "Caleb Heck"
    ],
    "rawPlayers": "Joel Graham & Caleb Heck"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "SubPar Team",
    "players": [
      "Josh Fragiacomo",
      "Jacob Martinez"
    ],
    "rawPlayers": "Josh Fragiacomo & Jacob Martinez"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Tetelestai",
    "players": [
      "Logan Cornelius",
      "Jesse Throw"
    ],
    "rawPlayers": "Logan Cornelius & Jesse Throw"
  },
  {
    "year": 2018,
    "division": "Men",
    "teamName": "Hilltop Spikes",
    "players": [
      "Max Model",
      "Cole Model"
    ],
    "rawPlayers": "Max Model & Cole Model"
  },
  {
    "year": 2018,
    "division": "Women",
    "teamName": "Ogres Heroes",
    "players": [
      "Alli Kauffman",
      "Becca Graham"
    ],
    "rawPlayers": "Alli Kauffman & Becca Graham"
  },
  {
    "year": 2018,
    "division": "Women",
    "teamName": "MOXIE",
    "players": [
      "Julie Haselton",
      "Jenna Coleman"
    ],
    "rawPlayers": "Julie Haselton & Jenna Coleman"
  },
  {
    "year": 2018,
    "division": "Women",
    "teamName": "RazzMaTazz",
    "players": [
      "Jordi Vigna",
      "Tori Farlow"
    ],
    "rawPlayers": "Jordi Vigna & Tori Farlow"
  },
  {
    "year": 2018,
    "division": "Women",
    "teamName": "Cougs",
    "players": [
      "Michaela Hershberger",
      "Ashley Showalter"
    ],
    "rawPlayers": "Michaela Hershberger & Ashley Showalter"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Cisek/Showalter",
    "players": [
      "Tyler Cisek",
      "Peter Jon Showalter"
    ],
    "rawPlayers": "Tyler Cisek & Peter Jon Showalter"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Spicy Rubi",
    "players": [
      "Anthony Rentsch",
      "Dan McPartland"
    ],
    "rawPlayers": "Anthony Rentsch & Dan McPartland"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Strange Embrace",
    "players": [
      "Devin Matson",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Devin Matson & Jarratt Rouse"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Origin Impact",
    "players": [
      "Chris Hornacek",
      "Patrick Drucker"
    ],
    "rawPlayers": "Chris Hornacek & Patrick Drucker"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Anchored LI",
    "players": [
      "Anthony Alvino",
      "Ryan Fitzgerald"
    ],
    "rawPlayers": "Anthony Alvino & Ryan Fitzgerald"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Golden Set",
    "players": [
      "Eric Zishka",
      "Harding Brumby"
    ],
    "rawPlayers": "Eric Zishka & Harding Brumby"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "Easily Dug",
    "players": [
      "Andrew Card",
      "Travis Core"
    ],
    "rawPlayers": "Andrew Card & Travis Core"
  },
  {
    "year": 2017,
    "division": "Men",
    "teamName": "2 Guys",
    "players": [
      "Preston Bies",
      "Troy Mauk"
    ],
    "rawPlayers": "Preston Bies & Troy Mauk"
  },
  {
    "year": 2017,
    "division": "Women",
    "teamName": "Ogres Heroes",
    "players": [
      "Alli Kauffman",
      "Becca Graham"
    ],
    "rawPlayers": "Alli Kauffman & Becca Graham"
  },
  {
    "year": 2017,
    "division": "Women",
    "teamName": "MOXIE",
    "players": [
      "Julie Haselton",
      "Jenna Coleman"
    ],
    "rawPlayers": "Julie Haselton & Jenna Coleman"
  },
  {
    "year": 2017,
    "division": "Women",
    "teamName": "Cougs",
    "players": [
      "Michaela Hershberger",
      "Ashley Showalter"
    ],
    "rawPlayers": "Michaela Hershberger & Ashley Showalter"
  },
  {
    "year": 2017,
    "division": "Women",
    "teamName": "Whipper Snappers",
    "players": [
      "Sam Maas",
      "Jordi Vigna"
    ],
    "rawPlayers": "Sam Maas & Jordi Vigna"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Chico Spikes",
    "players": [
      "Shaun Boyer",
      "Skyler Boles"
    ],
    "rawPlayers": "Shaun Boyer & Skyler Boles"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Strange Embrace",
    "players": [
      "Devin Matson",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Devin Matson & Jarratt Rouse"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "2 Guys",
    "players": [
      "Preston Bies",
      "Troy Mauk"
    ],
    "rawPlayers": "Preston Beis & Troy Mauk"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Safi",
    "players": [
      "Josiah Zimmerman",
      "Peter Jon Showalter"
    ],
    "rawPlayers": "Josiah Zimmerman & Peter Jon Showalter"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Nashburgh",
    "players": [
      "Joel Graham",
      "Scott Wilson"
    ],
    "rawPlayers": "Joel Graham & Scott Wilson"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "The Rookies",
    "players": [
      "Ryan Fitzgerald",
      "Tyler Cisek"
    ],
    "rawPlayers": "Ryan Fitzgerald & Tyler Cisek"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Origin Vengence",
    "players": [
      "Chris Hornacek",
      "Dylan Fogarty"
    ],
    "rawPlayers": "Chris Hornacek & Dylan Fogarty"
  },
  {
    "year": 2016,
    "division": "Men",
    "teamName": "Origin Chaos",
    "players": [
      "Matt Bohnen",
      "Ryan Weiler"
    ],
    "rawPlayers": "Matt Bohnen & Ryan Weiler"
  },
  {
    "year": 2016,
    "division": "Women",
    "teamName": "Ogres Heroes",
    "players": [
      "Alli Kauffman",
      "Becca Graham"
    ],
    "rawPlayers": "Alli Kauffman & Becca Graham"
  },
  {
    "year": 2016,
    "division": "Women",
    "teamName": "Shewolves",
    "players": [
      "Jenna Coleman",
      "Sam Maas"
    ],
    "rawPlayers": "Jenna Coleman & Sam Maas"
  },
  {
    "year": 2016,
    "division": "Women",
    "teamName": "Veinte Hamburguesas",
    "players": [
      "Charissa Wright",
      "Tori Farlow"
    ],
    "rawPlayers": "Charissa Wright & Tori Farlow"
  },
  {
    "year": 2016,
    "division": "Women",
    "teamName": "Origin XX",
    "players": [
      "Julie Haselton",
      "Molly McCauley"
    ],
    "rawPlayers": "Julie Haselton & Molly McCauley"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Chico Spikes",
    "players": [
      "Shaun Boyer",
      "Skyler Boles"
    ],
    "rawPlayers": "Shaun Boyer & Skyler Boles"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Strange Embrace",
    "players": [
      "Devin Matson",
      "Jarratt Rouse"
    ],
    "rawPlayers": "Devin Matson & Jarratt Rouse"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Monkey Business",
    "players": [
      "Peter Jon Showalter",
      "Seth Showalter"
    ],
    "rawPlayers": "Peter Jon Showalter & Seth Showalter"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "R.I.P.",
    "players": [
      "Brady Smith",
      "Kyle Kirkman"
    ],
    "rawPlayers": "Brady Smith & Kyle Kirkman"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Chubby Bunny",
    "players": [
      "Harding Brumby",
      "Troy Mauk"
    ],
    "rawPlayers": "Harding Brumby & Troy Mauk"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "The Rookies",
    "players": [
      "Ryan Fitzgerald",
      "Tyler Cisek"
    ],
    "rawPlayers": "Ryan Fitzgerald & Tyler Cisek"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Nashburgh",
    "players": [
      "Joel Graham",
      "Scott Wilson"
    ],
    "rawPlayers": "Joel Graham & Scott Wilson"
  },
  {
    "year": 2015,
    "division": "Men",
    "teamName": "Bunz &amp; Gunz",
    "players": [
      "Austin Fraker",
      "Cody Thompson"
    ],
    "rawPlayers": "Austin Fraker & Cody Thompson"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "Chico Spikes",
    "players": [
      "Shaun Boyer",
      "Skyler Boles"
    ],
    "rawPlayers": "Shaun Boyer & Skyler Boles"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "Handsome Beavers",
    "players": [
      "Bryce Clifford",
      "Buddy Hammon"
    ],
    "rawPlayers": "Bryce Clifford & Buddy Hammon"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "Nashburgh",
    "players": [
      "Joel Graham",
      "Scott Wilson"
    ],
    "rawPlayers": "Joel Graham & Scott Wilson"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "The Rookies",
    "players": [
      "Ryan Fitzgerald",
      "Tyler Cisek"
    ],
    "rawPlayers": "Ryan Fitzgerald & Tyler Cisek"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "Life From Mars",
    "players": [
      "John Schumacher",
      "Kyle Kirkman"
    ],
    "rawPlayers": "John Schumacher & Kyle Kirkman"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "V2",
    "players": [
      "Patrick Drucker",
      "Tom Cortesi"
    ],
    "rawPlayers": "Patrick Drucker & Tom Cortesi"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "Fluff",
    "players": [
      "Corey Heck",
      "Ian Golembeski"
    ],
    "rawPlayers": "Corey Heck & Ian Golembeski"
  },
  {
    "year": 2014,
    "division": "Men",
    "teamName": "The Danger Zone",
    "players": [
      "Jeff Schafer",
      "Seth Richmond"
    ],
    "rawPlayers": "Jeff Schafer & Seth Richmond"
  }
];

// Normalize player names for resilient matching
export const normalizePlayerName = (name?: string): string => {
  if (!name) return '';
  let clean = name.trim().replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();

  if (lower === 'pj showalter' || lower === 'peter showalter' || lower === 'peter jon showalter') return 'Peter Jon Showalter';
  if (lower === 'preston beis') return 'Preston Bies';
  if (lower === 'ashley gingerich-showalter' || lower === 'ashley gingerich showalter') return 'Ashley Showalter';
  if (lower === 'kayla wu fleming' || lower === 'kayla wu-fleming' || lower === 'kayla wu') return 'Kayla Wu';
  if (lower === 'jordann vigna') return 'Jordi Vigna';
  if (lower === 'matthew cole') return 'Matt Cole';
  if (lower === 'daniel mcpartland') return 'Dan McPartland';
  if (lower === 'ian  golembeski') return 'Ian Golembeski';
  if (lower === 'alli kauffman' || lower === 'alli kauffman rogers') return 'Alli Rogers';
  if (lower === 'kalin miramontes' || lower === 'kalin morgan') return 'Kalin Morgan';
  if (lower === 'lukas eisentraeger' || lower === 'lukas eisenträger') return 'Lukas Eisenträger';
  if (lower === 'ines paysan' || lower === 'inès paysan') return 'Inès Paysan';
  if (lower === 'kathleen phan' || lower === 'katheleen phan') return 'Katheleen Phan';
  if (lower === 'pac clifford' || lower === 'paq clifford') return 'Paq Clifford';

  return clean;
};

// Dynamic maps computed from ELITE_TEAMS
export const PLAYER_ALL_ELITE_YEARS: Record<string, number[]> = {};
export const PLAYER_FIRST_ELITE_YEAR: Record<string, number> = {};

for (const et of ELITE_TEAMS) {
  for (const rawP of et.players) {
    const pName = normalizePlayerName(rawP);
    if (!PLAYER_ALL_ELITE_YEARS[pName]) {
      PLAYER_ALL_ELITE_YEARS[pName] = [];
    }
    if (!PLAYER_ALL_ELITE_YEARS[pName].includes(et.year)) {
      PLAYER_ALL_ELITE_YEARS[pName].push(et.year);
    }
  }
}

for (const [pName, years] of Object.entries(PLAYER_ALL_ELITE_YEARS)) {
  years.sort((a, b) => a - b);
  PLAYER_FIRST_ELITE_YEAR[pName] = years[0];
}

// Check if a player is in the Spikeball Elite roster
export function isElitePlayer(name?: string): boolean {
  if (!name) return false;
  const norm = normalizePlayerName(name);
  if (PLAYER_FIRST_ELITE_YEAR[norm] !== undefined) return true;

  const lower = norm.toLowerCase();
  for (const [k] of Object.entries(PLAYER_FIRST_ELITE_YEAR)) {
    if (k.toLowerCase() === lower) return true;
  }
  return false;
}

// Get the year a player first achieved Spikeball Elite
export function getFirstEliteYear(name?: string): number | null {
  if (!name) return null;
  const norm = normalizePlayerName(name);
  if (PLAYER_FIRST_ELITE_YEAR[norm] !== undefined) return PLAYER_FIRST_ELITE_YEAR[norm];

  const lower = norm.toLowerCase();
  for (const [k, v] of Object.entries(PLAYER_FIRST_ELITE_YEAR)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// Get all years a player achieved Spikeball Elite
export function getAllEliteYears(name?: string): number[] {
  if (!name) return [];
  const norm = normalizePlayerName(name);
  if (PLAYER_ALL_ELITE_YEARS[norm] !== undefined) return PLAYER_ALL_ELITE_YEARS[norm];

  const lower = norm.toLowerCase();
  for (const [k, v] of Object.entries(PLAYER_ALL_ELITE_YEARS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return [];
}

// Formatted Elite tag for badges (e.g. "⭐ Elite '14, '15" or "⭐ Elite '24")
export function getEliteBadgeText(name?: string, short = false): string | null {
  const years = getAllEliteYears(name);
  if (years.length === 0) return null;

  if (short) {
    return '⭐ Elite';
  }

  const yrStrs = years.map(y => `'${String(y).slice(-2)}`).join(', ');
  return `⭐ Elite ${yrStrs}`;
}

// Check if a player is an Elite veteran at a specific tournament date/year
// (i.e. tournament year is strictly AFTER the year they first achieved Elite)
export function isEliteVeteranAtDate(name?: string, dateOrYear?: string | number | null): boolean {
  if (!name || !dateOrYear) return false;
  const firstYear = getFirstEliteYear(name);
  if (firstYear === null) return false;

  let eventYear: number;
  if (typeof dateOrYear === 'number') {
    eventYear = dateOrYear;
  } else {
    try {
      eventYear = new Date(dateOrYear).getFullYear();
    } catch {
      return false;
    }
  }

  if (isNaN(eventYear) || eventYear <= 0) return false;
  return eventYear > firstYear;
}

// Check if a team is a recognized Spikeball Elite team
export function getTeamEliteInfo(teamName?: string, rosterPlayers?: string[]): { isElite: boolean; years: number[]; title?: string } {
  if (!teamName && (!rosterPlayers || rosterPlayers.length === 0)) {
    return { isElite: false, years: [] };
  }

  const tClean = (teamName || '').toLowerCase().trim().replace(/[.\s-]/g, '');
  const matchedYears = new Set<number>();

  for (const et of ELITE_TEAMS) {
    const etClean = et.teamName.toLowerCase().trim().replace(/[.\s-]/g, '');
    let nameMatches = false;

    if (tClean && (tClean === etClean || tClean.includes(etClean) || etClean.includes(tClean))) {
      nameMatches = true;
    }

    // Check slash variations (e.g., "Pierson/Phan" vs "Phan/Pierson" or "Cisek/Showalter")
    const slashParts = et.teamName.split('/').map(s => s.trim().toLowerCase().replace(/[.\s-]/g, ''));
    if (slashParts.length === 2) {
      const reversedClean = `${slashParts[1]}${slashParts[0]}`;
      if (tClean === reversedClean || tClean.includes(reversedClean)) {
        nameMatches = true;
      }
    }

    // Check roster match: if both players from the Elite team are in rosterPlayers
    let rosterMatches = false;
    if (rosterPlayers && rosterPlayers.length >= 2 && et.players.length >= 2) {
      const normRoster = rosterPlayers.map(p => normalizePlayerName(p).toLowerCase());
      const p1 = normalizePlayerName(et.players[0]).toLowerCase();
      const p2 = normalizePlayerName(et.players[1]).toLowerCase();
      if (normRoster.includes(p1) && normRoster.includes(p2)) {
        rosterMatches = true;
      }
    }

    if (nameMatches || rosterMatches) {
      matchedYears.add(et.year);
    }
  }

  const years = Array.from(matchedYears).sort((a, b) => a - b);
  if (years.length > 0) {
    const yrStrs = years.map(y => `'${String(y).slice(-2)}`).join(', ');
    return {
      isElite: true,
      years,
      title: `⭐ Spikeball Elite (${yrStrs})`
    };
  }

  return { isElite: false, years: [] };
}
