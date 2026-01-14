export interface FamilyMember {
  id: string;
  name: string;
  year: string;
  imageUrl: string;
  relationship?: string;
  // In an ancestor tree model, "children" in the data structure actually represents parents in the real world
  // because we traverse upwards from the root individual.
  parents?: FamilyMember[];
  spouse?: FamilyMember;
}

// D3 Hierarchy Node uses 'children' property by default, so we map parents to children for D3
export interface D3Member extends Omit<FamilyMember, 'parents' | 'spouse'> {
  children?: D3Member[];
  spouse?: D3Member;
}