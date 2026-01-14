import { FamilyMember } from "./types.ts";

export const INITIAL_DATA: FamilyMember = {
  id: "root",
  name: "Samuel Legacy",
  year: "1955",
  imageUrl: "https://picsum.photos/id/1062/200/200", 
  parents: [
    {
      id: "p1",
      name: "Eleanor Rigby",
      year: "1925",
      imageUrl: "https://picsum.photos/id/338/200/200", 
      relationship: "Mother",
      parents: [
         {
            id: "gp1",
            name: "Father Rigby",
            year: "1899",
            imageUrl: "https://picsum.photos/id/1005/200/200",
            relationship: "Grandfather"
         }
      ]
    },
    {
      id: "p2",
      name: "Arthur Legacy",
      year: "1928",
      imageUrl: "https://picsum.photos/id/1025/200/200",
      relationship: "Father",
      parents: []
    }
  ]
};

export const COLORS = {
  background: "#FFFFFF",
  text: "#1A2F2F",
  subText: "#4B5563",
  link: "#9CA3AF",
  nodeBorder: "#1A2F2F",
  nodeBorderHover: "#D4AF37",
  accent: "#2F4F4F"
};