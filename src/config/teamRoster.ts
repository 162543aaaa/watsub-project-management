export interface TeamMember {
  name: string;
  position: string;
  email: string;
  role: "director" | "employee" | "admin";
}

export const TEAM_ROSTER: TeamMember[] = [
  { name: "TARMISI WANI", position: "Founding Director", email: "tamisiwani@gmail.com", role: "director" },
  { name: "สุไมยนา หวังเบ็ญหมัด", position: "Content Strategist & Client Coordinator", email: "dudhjjui@gmail.com", role: "employee" },
  { name: "ฮาฟีซ ดอเลาะ", position: "Videographer & Graphic Designer", email: "fisdoloh00@gmail.com", role: "employee" },
  { name: "Faheem Yusoh", position: "Production Assistant", email: "faheem.yusoh@watsub.local", role: "employee" },
  { name: "zuhariya yato", position: "Content Assistant", email: "zuhariya.yato@watsub.local", role: "employee" },
  { name: "Natdia Benyakat", position: "Content Coordinator", email: "natdia.benyakat@watsub.local", role: "employee" },
];
