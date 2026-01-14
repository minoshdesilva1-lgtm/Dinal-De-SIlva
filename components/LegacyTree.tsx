import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FamilyMember, D3Member } from '../types';
import { COLORS } from '../constants';

interface LegacyTreeProps {
  data: FamilyMember;
  width: number;
  height: number;
  onAddParent: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSpouse: (id: string) => void;
  onEdit: (member: D3Member) => void;
}

// Augmented D3 Member to hold pre-calculated spouse tree layout
interface D3MemberWithLayout extends D3Member {
  spouseTreeLayout?: d3.HierarchyPointNode<D3MemberWithLayout>;
  spouseTreeWidth?: number;
  // D3 injects these:
  x?: number;
  y?: number;
}

const transformData = (member: FamilyMember): D3MemberWithLayout => {
  const d3Node: D3MemberWithLayout = {
    id: member.id,
    name: member.name,
    year: member.year,
    imageUrl: member.imageUrl,
    relationship: member.relationship,
    spouse: member.spouse ? transformData(member.spouse) : undefined,
    children: member.parents ? member.parents.map(transformData) : undefined
  };
  return d3Node;
};

const LegacyTree: React.FC<LegacyTreeProps> = ({ data, width, height, onAddParent, onAddChild, onAddSpouse, onEdit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [expandedSpouseIds, setExpandedSpouseIds] = useState<Set<string>>(new Set());
  
  // Ref to store the current zoom transform state to prevent resetting on re-renders
  const currentZoomState = useRef<d3.ZoomTransform | null>(null);

  const toggleSpouse = (id: string) => {
    const newSet = new Set(expandedSpouseIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSpouseIds(newSet);
  };

  // --- Helper to calculate layout for a spouse tree recursively ---
  const calculateSpouseTreeLayout = (spouseNode: D3MemberWithLayout): { root: d3.HierarchyPointNode<D3MemberWithLayout>, width: number } => {
    // 1. Create Hierarchy
    const root = d3.hierarchy<D3MemberWithLayout>(spouseNode);
    
    // 2. Pre-process children's spouses recursively to get their widths
    root.descendants().forEach(node => {
        if (node.data.spouse && expandedSpouseIds.has(node.data.spouse.id)) {
            const layout = calculateSpouseTreeLayout(node.data.spouse);
            node.data.spouseTreeLayout = layout.root;
            node.data.spouseTreeWidth = layout.width;
        }
    });

    // 3. Layout this tree
    const layout = d3.tree<D3MemberWithLayout>()
        .nodeSize([270, 300])
        .separation((a, b) => {
            const aSpouseWidth = a.data.spouseTreeWidth || 0;
            const bSpouseWidth = b.data.spouseTreeWidth || 0;
            
            // Convert pixels to 'node slots' (approx 270px)
            const extraSpace = (aSpouseWidth + bSpouseWidth) / 270;
            
            let sep = a.parent === b.parent ? 1.1 : 1.3;
            if (a.data.spouse) sep += 0.8; 
            if (b.data.spouse) sep += 0.8;
            
            return sep + extraSpace;
        });
    
    const layoutRoot = layout(root);

    // 4. Calculate total width of this tree
    let minX = Infinity;
    let maxX = -Infinity;
    layoutRoot.each(d => {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        // Also account for the spouse attached to this node
        if (d.data.spouseTreeWidth) {
           // If the node has a spouse tree attached, the bounds extend further
           maxX = Math.max(maxX, d.x + 220 + d.data.spouseTreeWidth);
        } else if (d.data.spouse) {
           maxX = Math.max(maxX, d.x + 220); 
        }
    });
    
    // Safety check for single node
    const totalWidth = (minX === Infinity) ? 270 : (maxX - minX);

    return { root: layoutRoot, width: totalWidth };
  };


  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const d3Data = transformData(data);
    const rootHierarchy = d3.hierarchy<D3MemberWithLayout>(d3Data);

    // PRE-CALCULATE SPOUSE LAYOUTS for Main Tree
    rootHierarchy.descendants().forEach(node => {
        if (node.data.spouse && expandedSpouseIds.has(node.data.spouse.id)) {
            const layout = calculateSpouseTreeLayout(node.data.spouse);
            node.data.spouseTreeLayout = layout.root;
            node.data.spouseTreeWidth = layout.width;
        }
    });

    // MAIN TREE LAYOUT
    const treeLayout = d3.tree<D3MemberWithLayout>()
      .nodeSize([270, 300]) 
      .separation((a, b) => {
        const aSpouseWidth = a.data.spouseTreeWidth || 0;
        const bSpouseWidth = b.data.spouseTreeWidth || 0;
        
        const extraSpace = (aSpouseWidth + bSpouseWidth) / 270;

        let sep = a.parent === b.parent ? 1.1 : 1.3;
        
        // Base spouse spacing
        if (a.data.spouse) sep += 0.8;
        if (b.data.spouse) sep += 0.8;
        
        return sep + extraSpace;
      });

    treeLayout(rootHierarchy);

    const zoomGroup = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        // Update the ref with the latest transform
        currentZoomState.current = event.transform;
      });

    svg.call(zoom);

    // Initial Position Logic:
    // If we have a stored zoom state (from previous interaction), use it.
    // Otherwise (first render), center the tree at the bottom.
    if (currentZoomState.current) {
      svg.call(zoom.transform, currentZoomState.current);
    } else {
      const initialTransform = d3.zoomIdentity
        .translate(width / 2, height - 150)
        .scale(0.85);
      svg.call(zoom.transform, initialTransform);
    }

    const defs = svg.append("defs");
    const linksGroup = zoomGroup.append("g").attr("class", "links");
    const nodesGroup = zoomGroup.append("g").attr("class", "nodes");


    // --- RECURSIVE RENDERING FUNCTION ---
    const renderTreeRecursive = (
        nodes: d3.HierarchyPointNode<D3MemberWithLayout>[], 
        links: d3.HierarchyPointLink<D3MemberWithLayout>[],
        originX = 0,
        originY = 0,
        parentDirection = 1, // 1 for right, -1 for left (inherited)
        isMainTree = false
    ) => {
        
        // Custom link generator for this sub-tree context
        const linkGenerator = d3.linkVertical<d3.HierarchyPointLink<D3MemberWithLayout>, d3.HierarchyPointNode<D3MemberWithLayout>>()
            .x(d => originX + d.x)
            .y(d => originY + (isMainTree ? -d.y : d.y));

        // 1. Draw Links
        const linkSelection = linksGroup.append("g").selectAll(".link")
            .data(links)
            .enter()
            .append("g");

        linkSelection.append("path")
            .attr("id", d => `link-${d.target.data.id}`)
            .attr("d", d => {
                 const isLeft = d.target.x < d.source.x;
                 if (isLeft) {
                     return linkGenerator({source: d.target, target: d.source});
                 }
                 return linkGenerator(d);
            })
            .attr("fill", "none")
            .attr("stroke", COLORS.link)
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5);

        // Labels
        linkSelection.append("text")
            .attr("dy", -10)
            .style("pointer-events", "none")
            .append("textPath")
            .attr("href", d => `#link-${d.target.data.id}`)
            .attr("startOffset", "50%")
            .style("text-anchor", "middle")
            .text(d => d.target.data.relationship ? d.target.data.relationship.toUpperCase() : "")
            .attr("fill", COLORS.subText) 
            .style("font-family", "Cinzel, serif")
            .style("font-size", "10px")
            .style("letter-spacing", "3px")
            .style("font-weight", "900");

        // 2. Draw Nodes
        const nodeSelection = nodesGroup.append("g").selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${originX + d.x}, ${originY + (isMainTree ? -d.y : d.y)})`);

        nodeSelection.each(function(d) {
            const nodeGroup = d3.select(this);
            const uniqueId = `clip-${d.data.id}`;
            
            // Determine Direction for Spouse
            let direction = parentDirection;
            if (isMainTree) {
                // Assuming root is roughly at x=0
                direction = (d.x < 0) ? -1 : 1; 
            }
            
            // === MAIN MEMBER ===
            const mainGroup = nodeGroup.append("g")
                .style("cursor", "pointer")
                .on("click", (e) => {
                    e.stopPropagation();
                    onEdit(d.data);
                });

            defs.append("clipPath")
                .attr("id", uniqueId)
                .append("circle")
                .attr("r", 40);

            mainGroup.append("circle")
                .attr("r", 42)
                .attr("fill", COLORS.background)
                .attr("stroke", COLORS.nodeBorder)
                .attr("stroke-width", 2)
                .attr("class", "node-circle");

            mainGroup.append("image")
                .attr("xlink:href", d.data.imageUrl)
                .attr("width", 80)
                .attr("height", 80)
                .attr("x", -40)
                .attr("y", -40)
                .attr("clip-path", `url(#${uniqueId})`)
                .style("filter", "grayscale(100%) contrast(1.1)")
                .style("transition", "filter 0.3s ease");
            
            mainGroup.append("text")
                .attr("dy", 65)
                .attr("text-anchor", "middle")
                .text(d.data.name.toUpperCase())
                .attr("fill", COLORS.text)
                .attr("font-family", "Cinzel, serif")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .attr("letter-spacing", "1px");

            mainGroup.append("text")
                .attr("dy", 80)
                .attr("text-anchor", "middle")
                .text(d.data.year)
                .attr("fill", COLORS.subText)
                .attr("font-family", "Lato, sans-serif")
                .attr("font-size", "10px");

            // -- CONTROLS (Main Node) --
            const controls = nodeGroup.append("g")
                .attr("class", "controls")
                .attr("opacity", 0)
                .style("transition", "opacity 0.2s ease");
            
            // Determine Button Positions based on Tree Direction
            // Main Tree: Ancestors UP (-55), Descendants DOWN (95 - below text)
            // Spouse Tree: Ancestors DOWN (95 - below text), Descendants UP (-55)
            // This prevents buttons from overlapping the text (at 65-80)
            const ancestorY = isMainTree ? -55 : 95;
            const descendantY = isMainTree ? 95 : -55;

            // Add Ancestor
            const ancestorBtn = controls.append("g")
                .attr("transform", `translate(0, ${ancestorY})`)
                .style("cursor", "pointer")
                .on("click", (e) => {
                    e.stopPropagation();
                    onAddParent(d.data.id);
                });
            ancestorBtn.append("circle").attr("r", 10).attr("fill", COLORS.background).attr("stroke", COLORS.nodeBorder);
            ancestorBtn.append("text").attr("dy", 3.5).attr("text-anchor", "middle").text("+").attr("font-weight", "bold");
            ancestorBtn.append("title").text("Add Ancestor");

            // Add Descendant
            const descendantBtn = controls.append("g")
                .attr("transform", `translate(0, ${descendantY})`)
                .style("cursor", "pointer")
                .on("click", (e) => {
                    e.stopPropagation();
                    onAddChild(d.data.id);
                });
            descendantBtn.append("circle").attr("r", 10).attr("fill", COLORS.background).attr("stroke", COLORS.nodeBorder);
            descendantBtn.append("text").attr("dy", 3.5).attr("text-anchor", "middle").text("+").attr("font-weight", "bold");
            descendantBtn.append("title").text("Add Descendant");
            
            // Add Spouse (if none)
            if (!d.data.spouse) {
                const btnX = 55 * direction;
                const sideBtn = controls.append("g")
                    .attr("transform", `translate(${btnX}, 0)`)
                    .style("cursor", "pointer")
                    .on("click", (e) => {
                        e.stopPropagation();
                        onAddSpouse(d.data.id);
                    });
                sideBtn.append("circle").attr("r", 10).attr("fill", COLORS.background).attr("stroke", COLORS.nodeBorder);
                sideBtn.append("text").attr("dy", 3.5).attr("text-anchor", "middle").text("♥").attr("font-size", "10px").attr("fill", COLORS.accent);
                sideBtn.append("title").text("Add Spouse");
            }

            mainGroup.on("mouseenter", () => controls.attr("opacity", 1))
                     .on("mouseleave", () => controls.attr("opacity", 0));
            controls.on("mouseenter", () => controls.attr("opacity", 1))
                    .on("mouseleave", () => controls.attr("opacity", 0));


            // === SPOUSE RENDERING ===
            if (d.data.spouse) {
                const spouse = d.data.spouse;
                const spouseId = `clip-spouse-${spouse.id}`;
                const spouseOffset = 220 * direction;
                
                // Connection
                const pathId = `link-spouse-${d.data.id}`;
                let pathD = "";
                if (direction === -1) {
                    pathD = `M -170 0 Q -110 30 -50 0`;
                } else {
                    pathD = `M 50 0 Q 110 30 170 0`;
                }
                
                nodeGroup.append("path")
                    .attr("id", pathId)
                    .attr("d", pathD)
                    .attr("fill", "none")
                    .attr("stroke", COLORS.link)
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "4,4")
                    .attr("stroke-opacity", 0.6);

                nodeGroup.append("text")
                    .attr("dy", -5)
                    .style("pointer-events", "none")
                    .append("textPath")
                    .attr("href", `#${pathId}`)
                    .attr("startOffset", "50%")
                    .style("text-anchor", "middle")
                    .text(spouse.relationship ? spouse.relationship.toUpperCase() : "SPOUSE")
                    .attr("fill", COLORS.subText)
                    .style("font-family", "Cinzel, serif")
                    .style("font-size", "9px")
                    .style("letter-spacing", "2px")
                    .style("font-weight", "bold");

                // Spouse Group
                const spouseGroup = nodeGroup.append("g")
                    .attr("transform", `translate(${spouseOffset}, 0)`)
                    .style("cursor", "pointer")
                    .on("click", (e) => {
                        e.stopPropagation();
                        // Handle toggle expansion
                        toggleSpouse(spouse.id);
                    });
                
                defs.append("clipPath")
                    .attr("id", spouseId)
                    .append("circle")
                    .attr("r", 40);

                spouseGroup.append("circle")
                    .attr("r", 42)
                    .attr("fill", COLORS.background)
                    .attr("stroke", COLORS.nodeBorder)
                    .attr("stroke-width", 2);

                spouseGroup.append("image")
                    .attr("xlink:href", spouse.imageUrl)
                    .attr("width", 80)
                    .attr("height", 80)
                    .attr("x", -40)
                    .attr("y", -40)
                    .attr("clip-path", `url(#${spouseId})`)
                    .style("filter", "grayscale(100%) contrast(1.1)")
                    .style("transition", "filter 0.3s ease");

                spouseGroup.append("text")
                    .attr("dy", 65)
                    .attr("text-anchor", "middle")
                    .text(spouse.name.toUpperCase())
                    .attr("fill", COLORS.text)
                    .attr("font-family", "Cinzel, serif")
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .attr("letter-spacing", "1px");

                spouseGroup.append("text")
                    .attr("dy", 80)
                    .attr("text-anchor", "middle")
                    .text(spouse.year)
                    .attr("fill", COLORS.subText)
                    .attr("font-family", "Lato, sans-serif")
                    .attr("font-size", "10px");
                
                const spouseControls = nodeGroup.append("g")
                    .attr("transform", `translate(${spouseOffset}, 0)`)
                    .attr("opacity", 0)
                    .style("transition", "opacity 0.2s ease");
                
                // Edit Button
                const sEditBtn = spouseControls.append("g")
                    .attr("transform", "translate(35, -35)")
                    .style("cursor", "pointer")
                    .on("click", (e) => {
                        e.stopPropagation();
                        onEdit(spouse);
                    });
                sEditBtn.append("circle").attr("r", 8).attr("fill", COLORS.background).attr("stroke", COLORS.nodeBorder);
                sEditBtn.append("text").attr("dy", 3).attr("text-anchor", "middle").text("✎").attr("font-size", "10px");
                sEditBtn.append("title").text("Edit Details");

                // Spouse Interaction
                spouseGroup.on("mouseenter", function() {
                    d3.select(this).select("image").style("filter", "grayscale(0%) contrast(1)");
                    d3.select(this).select("circle").attr("stroke", COLORS.nodeBorderHover);
                    spouseControls.attr("opacity", 1);
                }).on("mouseleave", function() {
                    d3.select(this).select("image").style("filter", "grayscale(100%) contrast(1.1)");
                    d3.select(this).select("circle").attr("stroke", COLORS.nodeBorder);
                    spouseControls.attr("opacity", 0);
                });
                
                spouseControls.on("mouseenter", () => spouseControls.attr("opacity", 1))
                              .on("mouseleave", () => spouseControls.attr("opacity", 0));


                // === RENDER SPOUSE'S SUB-TREE ===
                if (expandedSpouseIds.has(spouse.id) && d.data.spouseTreeLayout) {
                    const subRoot = d.data.spouseTreeLayout;
                    
                    const spouseVisualX = originX + d.x + spouseOffset;
                    const spouseVisualY = originY + (isMainTree ? -d.y : d.y);
                    
                    // Filter out the root node (the spouse itself) from the recursive render.
                    // The spouse is already rendered manually above with specific controls.
                    // This prevents double-rendering and removes unwanted "Add Ancestor/Descendant/Spouse" buttons on the spouse node.
                    const subTreeNodes = subRoot.descendants().filter(n => n.depth !== 0);

                    renderTreeRecursive(
                        subTreeNodes, 
                        subRoot.links(), 
                        spouseVisualX, 
                        spouseVisualY,
                        direction, // Inherit direction (left/right of tree)
                        false // This is a spouse tree
                    );
                }
            }
        });
    };

    // Kick off rendering with Main Tree
    renderTreeRecursive(rootHierarchy.descendants(), rootHierarchy.links(), 0, 0, 1, true);

  }, [data, width, height, onAddParent, onAddChild, onAddSpouse, onEdit, expandedSpouseIds]);

  return (
    <div ref={wrapperRef} className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative bg-legacy-bg">
        <svg ref={svgRef} width={width} height={height} className="block" />
        <div className="absolute inset-0 pointer-events-none" 
             style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(242, 240, 229, 0.4) 100%)'}}>
        </div>
    </div>
  );
};

export default LegacyTree;