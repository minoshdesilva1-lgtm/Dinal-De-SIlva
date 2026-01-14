import React, { useState, useEffect } from 'react';
import LegacyTree from './components/LegacyTree';
import EditModal from './components/EditModal';
import { Header, NavigationInstructions } from './components/Layout';
import { INITIAL_DATA } from './constants';
import { FamilyMember, D3Member } from './types';

// Helper to calculate total connections (Degree) for a node
const calculateDegree = (root: FamilyMember, targetId: string): number => {
  let degree = 0;
  
  const traverse = (node: FamilyMember) => {
    // 1. If this node IS the target, count its outgoing references (Parents + Spouse)
    if (node.id === targetId) {
      if (node.parents) degree += node.parents.length;
      if (node.spouse) degree += 1;
    }

    // 2. If this node REFERENCES the target
    // Check parents array (Child -> Parent connection)
    if (node.parents) {
      if (node.parents.some(p => p.id === targetId)) {
        degree += 1;
      }
      node.parents.forEach(traverse);
    }
    
    // Check spouse property (Spouse -> Spouse connection)
    if (node.spouse) {
      if (node.spouse.id === targetId) {
        degree += 1;
      }
      traverse(node.spouse);
    }
  };

  traverse(root);
  return degree;
};

function App() {
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [data, setData] = useState<FamilyMember>(INITIAL_DATA);
  const [editingMember, setEditingMember] = useState<D3Member | FamilyMember | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Logic to Modify Tree ---

  const updateNode = (tree: FamilyMember, targetId: string, updates: Partial<FamilyMember>): FamilyMember => {
    if (tree.id === targetId) {
      return { ...tree, ...updates };
    }
    
    let updatedSpouse = tree.spouse;
    if (tree.spouse) {
      if (tree.spouse.id === targetId) {
        updatedSpouse = { ...tree.spouse, ...updates };
      } else {
        updatedSpouse = updateNode(tree.spouse, targetId, updates);
      }
    }

    let updatedParents = tree.parents;
    if (tree.parents && tree.parents.length > 0) {
      updatedParents = tree.parents.map(p => updateNode(p, targetId, updates));
    }

    return {
      ...tree,
      spouse: updatedSpouse,
      parents: updatedParents
    };
  };

  // Strict Pruning: Delete the node and its entire subtree
  const deleteNode = (tree: FamilyMember, targetId: string): FamilyMember | null => {
    // 1. If this node is the target, return null to remove it from parent/spouse
    if (tree.id === targetId) {
      return null;
    }

    // 2. Recursively check spouse
    // We must create a new reference if spouse changes
    let updatedSpouse = tree.spouse;
    if (tree.spouse) {
      const res = deleteNode(tree.spouse, targetId);
      if (res === null) {
        updatedSpouse = undefined; // Spouse removed
      } else if (res !== tree.spouse) {
        updatedSpouse = res; // Spouse updated (deeply)
      }
    }
    
    // 3. Recursively check parents
    let updatedParents = tree.parents;
    if (tree.parents && tree.parents.length > 0) {
      const newParents: FamilyMember[] = [];
      let changed = false;
      
      for (const p of tree.parents) {
        const res = deleteNode(p, targetId);
        if (res === null) {
          changed = true; // Parent removed
        } else {
          newParents.push(res);
          if (res !== p) changed = true; // Parent updated (deeply)
        }
      }
      
      if (changed) {
        updatedParents = newParents;
      }
    }

    // Return new object only if something changed
    if (updatedSpouse !== tree.spouse || updatedParents !== tree.parents) {
      return {
        ...tree,
        spouse: updatedSpouse,
        parents: updatedParents
      };
    }

    return tree;
  };

  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => {
    setData(prev => updateNode(prev, id, updates));
  };

  const handleDeleteMember = (id: string) => {
    if (id === data.id) {
      alert("Cannot delete the root person of the tree.");
      return;
    }
    
    // Calculate degree again to be safe
    const degree = calculateDegree(data, id);
    if (degree > 1) {
      console.warn(`Attempted to delete member ${id} with degree ${degree}. Action blocked.`);
      return;
    }

    console.log(`Deleting member: ${id}`);
    const newData = deleteNode(data, id);
    
    if (newData) {
      setData(newData);
      setEditingMember(null); 
    } else {
        console.error("Failed to generate new tree data after deletion.");
    }
  };

  const addParentToNode = (current: FamilyMember, targetId: string): FamilyMember => {
    if (current.id === targetId) {
      const newParent: FamilyMember = {
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: "New Ancestor",
        year: `${parseInt(current.year) - 25}`, 
        imageUrl: "https://picsum.photos/200",
        relationship: "Parent",
        parents: []
      };
      
      return {
        ...current,
        parents: [...(current.parents || []), newParent]
      };
    }

    let updatedSpouse = current.spouse;
    if (current.spouse) {
       updatedSpouse = addParentToNode(current.spouse, targetId);
    }

    let updatedParents = current.parents;
    if (current.parents && current.parents.length > 0) {
      updatedParents = current.parents.map(p => addParentToNode(p, targetId));
    }

    return {
      ...current,
      spouse: updatedSpouse,
      parents: updatedParents
    };
  };

  const addSpouseToNode = (current: FamilyMember, targetId: string): FamilyMember => {
    if (current.id === targetId) {
      if (current.spouse) {
        alert("This member already has a spouse.");
        return current;
      }
      return {
        ...current,
        spouse: {
          id: `spouse-${Date.now()}`,
          name: "New Spouse",
          year: current.year,
          imageUrl: "https://picsum.photos/200",
          relationship: "Spouse",
          parents: []
        }
      };
    }

    let updatedSpouse = current.spouse;
    if (current.spouse) {
       updatedSpouse = addSpouseToNode(current.spouse, targetId);
    }

    let updatedParents = current.parents;
    if (current.parents && current.parents.length > 0) {
      updatedParents = current.parents.map(p => addSpouseToNode(p, targetId));
    }

    return {
      ...current,
      spouse: updatedSpouse,
      parents: updatedParents
    };
  };

  const handleAddParent = (id: string) => {
    const newData = addParentToNode(data, id);
    setData(newData);
  };

  const handleAddSpouse = (id: string) => {
    const newData = addSpouseToNode(data, id);
    setData(newData);
  };

  const handleAddChild = (id: string) => {
    if (id === data.id) {
      const newRoot: FamilyMember = {
        id: `child-${Date.now()}`,
        name: "New Descendant",
        year: `${parseInt(data.year) + 25}`,
        imageUrl: "https://picsum.photos/200",
        parents: [{ ...data, relationship: "Parent" }] 
      };
      setData(newRoot);
    } else {
      alert("In this view, you can only extend descendants from the root of the tree.");
    }
  };

  // Determine eligibility
  const canDelete = editingMember 
    ? (editingMember.id !== data.id && calculateDegree(data, editingMember.id) === 1)
    : false;

  return (
    <div className="w-screen h-screen bg-legacy-bg overflow-hidden relative selection:bg-legacy-primary selection:text-white">
      
      <Header />
      
      <main className="absolute inset-0 z-0">
        <LegacyTree 
          data={data} 
          width={dimensions.width} 
          height={dimensions.height}
          onAddParent={handleAddParent}
          onAddChild={handleAddChild}
          onAddSpouse={handleAddSpouse}
          onEdit={(member) => setEditingMember(member)}
        />
      </main>

      {editingMember && (
        <EditModal 
          member={editingMember} 
          onSave={handleUpdateMember} 
          onDelete={handleDeleteMember}
          onClose={() => setEditingMember(null)} 
          canDelete={canDelete}
        />
      )}

      <NavigationInstructions />

      <div className="fixed inset-0 pointer-events-none opacity-[0.05] mix-blend-multiply z-40" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

    </div>
  );
}

export default App;