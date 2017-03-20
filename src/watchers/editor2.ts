//--------------------------------------------------------------------
// Editor
//--------------------------------------------------------------------

import {Watcher, Program, RawMap, RawValue, RawEAV, forwardDiffs, appendAsEAVs, createId} from "../watchers/watcher";
import {CompilerWatcher} from "../watchers/compiler";

class EditorWatcher extends Watcher {
  editor: Program;
  setup() {
    this.editor = this.createEditor();
    let {editor, program} = this;

    editor
      .block("Draw the root editor view.", ({find, record}) => {
        let editor = find("editor/root");

        return [
          record("editor/view", "ui/row", {editor}).add("children", [
            record("editor/nav", "ui/column", {editor, sort: 0}),
            record("editor/main", "ui/column", {editor, sort: 1}).add("children", [
              record("ui/row", {editor, sort: 0, class: "editor-block-header"}).add("children", [
                record("editor/block/description", "ui/column", {editor}),
                record("editor/block/storyboard", "ui/row", {editor})
              ]),
              record("ui/row", "editor/block/content", {editor, sort: 1})
            ])
          ])
        ];
      })
      .block("Attach the current frame type to the editor content window.", ({find}) => {
        let editor = find("editor/root");
        let {active_frame} = editor;
        let content = find("editor/block/content", {editor});
        return [content.add("type", active_frame.type)];
      })

      .block("A node is another node's parent if it has an AV who's V is the other node's entity", ({find}) => {
        let parent = find("node");
        let node = find("node");
        node != parent;
        let {attribute} = parent;
        attribute.value == node.entity;
        return [node.add({parent, parent_field: attribute.attribute})];
      })

      .block("Mark nodes without parents as root nodes.", ({find, not}) => {
        let node = find("node");
        not(() => node.parent);
        return [node.add("tag", "root-node")];
      })

    this.navigation();
    this.header();

    this.nodeTree();
    this.queryEditor();


    this.fixtures();
    this.initEditor();
  }

  initEditor() {
    const EDITOR_ID = createId();
    const STYLE_ID = createId();

    const TAG_MARINA_ID = createId();
    const TAG_MARINARA_ID = createId();
    const BLOCK_PPL_W_BOATS_ID = createId();
    const BLOCK_BOAT_TYPES_ID = createId();
    const FRAME_PPL_W_BOATS_QUERY_ID = createId();

    let fixture:RawEAV[] = [
      [EDITOR_ID, "tag", "editor/root"],
      [STYLE_ID, "tag", "html/element"],
      [STYLE_ID, "tagname", "link"],
      [STYLE_ID, "rel", "stylesheet"],
      [STYLE_ID, "href", "assets/css/editor.css"],
      ["|init", "tag", "editor/init"]
    ];

    this.editor.inputEavs(fixture);
  }

  fixtures() {
    this.editor
      .commit("When the init tag is added, preload the system with sample data.", ({find, record}) => {
        let init = find("editor/init");
        let editor = find("editor/root");

        let block1, frame1, person_node, boat_node, dock_node;
        return [
          editor.add("block", [
            block1 = record("block", {sort: 1}).add({
              nav_tag: record("nav/tag", {name: "Marina"}),
              name: "People with boats",
              description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
              storyboard: [
                frame1 = record("frame", {type: "query", sort: 1}),
                record("frame", {type: "data", sort: 2}),
              ],

              node: [
                dock_node = record("node", {sort: 3, entity: record("entity", {z: 1})}).add("attribute", [
                  record({attribute: "state"})
                ]),
                boat_node = record("node", {sort: 2, entity: record("entity", {z: 2})}).add("attribute", [
                  record({attribute: "type", value: "yacht"}),
                  record({attribute: "name"}),
                  record({attribute: "dock", value: dock_node.entity})
                ]),
                person_node = record("node", {sort: 1, entity: record("entity", {z: 3})}).add("attribute", [
                  record({attribute: "tag", value: "person"}),
                  // record({attribute: "tag"}),
                  record({attribute: "age"}),
                  record({attribute: "boat", value: boat_node.entity})
                ]),
              ]
            })
          ]),
          editor.add({active_block: block1, active_frame: frame1}),
          init.remove()
        ];
      })
  }

  createEditor() {
    let editor = new Program("Editor");
    editor.attach("compiler");

    editor.attach("ui");
    editor.attach("shape");

    let compiler = editor.attach("compiler") as CompilerWatcher;
    compiler.injectInto(this.program);
    compiler.registerWatcherFunction("send-to-editor", forwardDiffs(editor, "send-to-editor"));

    return editor;
  }

  //--------------------------------------------------------------------
  // Navigation
  //--------------------------------------------------------------------

  navigation() {
    this.editor
      .block("Populate the nav bar with the program's block tags.", ({find, record}) => {
        let nav = find("editor/nav");
        let tag = nav.editor.block.nav_tag;
        return [
          nav.add("children", [
            record("editor/nav/tag", "ui/column", {editor: nav.editor, sort: tag.name, nav_tag: tag}).add("children", [
              record("ui/text", {sort: 0, text: tag.name})
            ])
          ])
        ];
      })

      .block("Populate nav tags with the blocks that have them.", ({find, choose, record}) => {
        let tag = find("editor/nav/tag");
        let block = tag.editor.block;
        block.nav_tag == tag.nav_tag;

        let [name] = choose(() => block.name, () => "Untitled Block");

        return [
          tag.add("children", [
            record("editor/nav/block", "ui/text", {editor: tag.editor, nav_tag: tag.nav_tag, block, text: name, sort: name})
          ])
        ];
      });
  }

  //--------------------------------------------------------------------
  // Header
  //--------------------------------------------------------------------

  header() {
    this.editor
      .block("Populate the block description for the active block.", ({find, choose, record}) => {
        let description = find("editor/block/description");
        let active_block = description.editor.active_block;

        let [name] = choose(() => active_block.name, () => "Untitled Block");
        let [text] = choose(() => active_block.description, () => "");

        return [
          description.add("children", [
            record("ui/text", {sort: 0, text: name, class: "editor-block-title"}),
            record("ui/text", {sort: 1, text})
          ])
        ];
      })

      .block("Populate the block storyboard for the active block.", ({find, record}) => {
        let storyboard = find("editor/block/storyboard");
        let {editor} = storyboard;
        let {active_block} = editor;
        let frame = active_block.storyboard;
        return [
          storyboard.add("children", [
            record("editor/block/frame", "ui/column", {editor, sort: frame.sort, frame}).add("children", [
              record("ui/text", {text: frame.type})
            ])
          ])
        ];
      })

      .block("Mark the active frame.", ({find}) => {
        let editor = find("editor/root");
        let {active_frame:frame} = editor;
        let frame_elem = find("editor/block/frame", {frame});
        return [frame_elem.add("class", "active")];
      })

      .commit("Clicking a frame activates it.", ({find}) => {
        let frame_elem = find("editor/block/frame");
        find("html/event/click", {element: frame_elem});
        let {frame, editor} = frame_elem;
        return [editor.remove("active_frame").add("active_frame", frame)];
      })

      .block("Addnew frame button to the storyboard.", ({find, record}) => {
        let storyboard = find("editor/block/storyboard");
        let {editor} = storyboard;
        let {active_block} = editor;
        return [
          storyboard.add("children", [
            record("editor/new-frame", "editor/block/frame", "ui/column", {editor, sort: Infinity})
          ])
        ];
      })

      .commit("Clicking the new frame button opens it.", ({find}) => {
        let new_frame = find("editor/new-frame");
        find("html/event/click", "html/direct-target", {element: new_frame});
        return [
          new_frame.add("open", "true")
        ];
      })

      .block("When the new frame is open, display a list of editor types to choose from.", ({find, record}) => {
        let new_frame = find("editor/new-frame", {open: "true"});
        let {editor} = new_frame;
        return [
          new_frame.add("children", [
            record("editor/new-frame/type", "ui/button", {editor, text: "Query", type: "query", class: "flat"}),
            record("editor/new-frame/type", "ui/button", {editor, text: "Data", type: "data", class: "flat"}),
          ])
        ];
      })

      .commit("Clicking a new frame type adds a frame of that type and closes the new frame button.", ({find, gather, choose, record}) => {
        let new_frame_type = find("editor/new-frame/type");
        find("html/event/click", "html/direct-target", {element: new_frame_type});
        let {type, editor} = new_frame_type;
        let new_frame = find("editor/new-frame", {editor});
        let {active_block:block} = editor;
        let [ix] = choose(() => gather(block.storyboard).per(block).count() + 1, () => 1);
        return [
          new_frame.remove("open"),
          block.add("storyboard", [
            record("frame", {block, type, sort: ix})
          ])
        ];
      });
  }

  //--------------------------------------------------------------------
  // Node Tree
  //--------------------------------------------------------------------

  nodeTree() {
    this.editor
      .block("Decorate the node tree as a column.", ({find, record}) => {
        let tree = find("editor/node-tree");
        let side = 21, lineWidth = 1, strokeStyle = "#AAA";
        return [tree.add({tag: "ui/column"}).add("children", [
          record("editor/node-tree/node", "editor/node-tree/node/new", "ui/row", {sort: Infinity, tree}).add("children", [
            record("editor/node-tree/node/hex", "shape/hexagon", {
              sort: 0, tree, side, lineWidth, strokeStyle
            }).add("content", [
              record("ui/button", {icon: "android-add"})
            ])
          ])
        ])];
      })

      .block("When the new node is open, it has an input for specifying the tag.", ({find, record}) => {
        let new_node = find("editor/node-tree/node/new", {open: "true"});
        return [
          new_node.add("children", [
            record("editor/node-tree/node/new/tag", "ui/autocomplete", "html/trigger-focus", "html/autosize-input", {sort: 2, new_node, placeholder: "tag..."}),
            record("editor/node-tree/node/new/save", "ui/button", {sort: 3, new_node, icon: "android-add"})
          ])
        ];
      })

      .block("Fill tag completions.", ({find, record}) => {
        let new_tag = find("editor/node-tree/node/new/tag");
        return [
          new_tag.add("completion", [
            record({text: "person"}),
            record({text: "pet"}),
            record({text: "boat"}),
            record({text: "dock"}),
            record({text: "cat"}),
          ])
        ];
      })

      .block("Each root node is an element in the tree.", ({find, record}) => {
        let tree = find("editor/node-tree");
        let {node} = tree;
        node.tag == "root-node";
        return [
          tree.add("children", [
            record("editor/node-tree/node", {tree, node, sort: node.sort})
          ])
        ];
      })
      .block("A node's name is it's parent_field if it has one, or it's tag attribute.", ({find, choose}) => {
        let tree_node = find("editor/node-tree/node");
        let {node} = tree_node;
        let [name] = choose(
          () => node.parent_field,
          () => {
            let {attribute} = node;
            attribute.attribute == "tag";
            return attribute.value;
          },
          () => "???"
        );
        return [tree_node.add("name", name)]
      })
      .block("A node's label is the uppercased first character of it's name.", ({find, lib:{string}}) => {
        let tree_node = find("editor/node-tree/node");
        let {name} = tree_node;
        let label = string.uppercase(string.get(name, 1));
        return [tree_node.add("label", label)];
      })
      .block("FIXME: A node's color is gray.", ({find, lib:{string}}) => {
        let tree_node = find("editor/node-tree/node");
        return [tree_node.add("color", "gray")];
      })

      .block("A node consists of a hex, and a pattern.", ({find, record}) => {
        let tree_node = find("editor/node-tree/node");
        let {tree, color} = tree_node;
        let side = 21, lineWidth = 1, strokeStyle = "#AAA";
        return [
          tree_node.add({tag: "ui/row"}).add("children", [
            record("editor/node-tree/node/hex", "shape/hexagon", {sort: 0, tree_node, side, lineWidth, strokeStyle}).add("content", [
              record("ui/text", {text: tree_node.label, style: record({color})})
            ]),
            record("editor/node-tree/node/pattern", {sort: 1, tree_node})
          ])
        ];
      })

      .block("A node pattern is a column of fields on the node.", ({find, record}) => {
        let node_pattern = find("editor/node-tree/node/pattern");
        let {tree_node} = node_pattern;
        let {name} = tree_node;

        return [
          node_pattern.add({tag: "ui/column"}).add("children", [
            record("ui/row", {sort: 0, node_pattern}).add("children", [
              record("editor/node-tree/node/pattern/name", "ui/text", {text: name})
            ])
          ])
        ];
      })

      .block("If a node has attributes, display them in it's pattern.", ({find, not, choose, record}) => {
        let node_pattern = find("editor/node-tree/node/pattern");
        let {tree_node} = node_pattern;
        let {node} = tree_node;
        let {attribute} = node;
        not(() => {attribute.attribute == "tag"; attribute.value == tree_node.name});
        not(() => attribute.value == find("entity"));
        let [sort] = choose(() => `z${attribute.sort}`, () => attribute.attribute, () => 999);
        return [
          node_pattern.add("children", [
            record("editor/node-tree/fields", "ui/column", {sort: 1, tree_node, attribute}).add("children", [
              record("editor/node-tree/node/pattern/field", "ui/row", {sort, tree_node, attribute})
            ])
          ])
        ];
      })
      .block("A node displays attributes as text", ({find, record}) => {
        let pattern_field = find("editor/node-tree/node/pattern/field");
        let {tree_node, attribute} = pattern_field;
        let field = attribute.attribute;
        return [
          pattern_field.add("children", [
            record("ui/text", {sort: 1, text: field})
          ])
        ];
      })

      .block("If a node's attribute has a value, display them in it's field.", ({find, not, record}) => {
        let field = find("editor/node-tree/node/pattern/field");
        let {tree_node, attribute} = field;
        not(() => field.open);
        not(() => {attribute.attribute == "tag"; attribute.value == tree_node.name});
        return [
          field.add("children", [
            record("editor/node-tree/node/pattern/value", "ui/text", {sort: 2, tree_node, text: attribute.value})
          ])
        ];
      })

      .block("An open field has a value cell even if it's attribute lacks one.", ({find, choose, record}) => {
        let field = find("editor/node-tree/node/pattern/field", {open: "true"});
        let {tree_node, attribute} = field;
        let [value] = choose(() => attribute.value, () => "");
        return [
          field.add("children", [
            record("editor/node-tree/node/pattern/value", "ui/input", "html/trigger-focus", "html/autosize-input", {sort: 2, tree_node, initial: value})
          ])
        ];
      })

      .block("An open node displays controls beneath itself.", ({find, record}) => {
        let tree_node = find("editor/node-tree/node", {open: "true"});
        let hex = find("editor/node-tree/node/hex", {tree_node});
        return [
          hex.add("children", [
            record("editor/node-tree/node/controls", "ui/row", {tree_node}).add("children", [
              //record("editor/node-tree/node/add-field", "ui/button", {sort: 1, tree_node, icon: "android-add"}),
              record("editor/node-tree/node/delete", "ui/button", {sort: 2, tree_node, icon: "android-close"})
            ])
          ])
        ];
      })

      .block("An open node displays delete buttons on its fields.", ({find, choose, record}) => {
        let field = find("editor/node-tree/node/pattern/field");
        let {tree_node, attribute} = field;
        tree_node.open;
        return [
          field.add("children", [
            record("editor/node-tree/node/field/delete", "ui/button", {sort: 0, tree_node, attribute, icon: "android-close"})
          ])
        ];
      })

      .block("An open node displays a plus field button in its pattern.", ({find, record}) => {
        let tree_node = find("editor/node-tree/node", {open: "true"});
        let node_pattern = find("editor/node-tree/node/pattern", {tree_node});
        return [
          node_pattern.add("children", [
            record("ui/column", {sort: 2, node_pattern, class: "editor-node-tree-new-field"}).add("children", [
              record("editor/node-tree/node/pattern/new-field", "ui/row", {tree_node}).add("children", [
                record("editor/node-tree/node/field/new", "ui/button", {sort: 1, tree_node, icon: "android-add"}),
                record("editor/node-tree/node/field/new/attribute", "ui/input", "html/autosize-input", {sort: 2, tree_node, placeholder: "attribute..."}),
              ])
            ])
          ])
        ];
      })

      .block("Non root nodes are children of their parent's pattern.", ({find, record}) => {
        let node = find("node");
        let {parent} = node;
        let tree_node = find("editor/node-tree/node", {node: parent});
        let node_pattern = find("editor/node-tree/node/pattern", {tree_node});
        let {tree} = tree_node;
        tree.node == node;

        return [
          node_pattern.add("children", [
            record("ui/column", {sort: 3, node_pattern: node_pattern, class: "editor-node-tree-subnodes"}).add("children", [
              record("editor/node-tree/node", {tree, node, sort: node.sort})
            ])
          ])
        ];
      });

    //--------------------------------------------------------------------
    // Node Tree Interaction
    //--------------------------------------------------------------------
    this.editor
      .commit("Clicking a node's hex opens it.", ({find, not}) => {
        let hex = find("editor/node-tree/node/hex");
        find("html/event/click", {element: hex});
        let {tree_node} = hex;
        not(() => tree_node.open);
        return [tree_node.add("open", "true")];
      })
      .commit("Clicking an open node's hex closes it.", ({find}) => {
        let hex = find("editor/node-tree/node/hex");
        find("html/event/click", {element: hex});
        let {tree_node} = hex;
        tree_node.open;
        return [tree_node.remove("open")];
      })
      .commit("Clicking outside an open tree node closes it.", ({find, not}) => {
        let tree_node = find("editor/node-tree/node", {open: "true"});
        find("html/event/click");
        not(() =>  find("html/event/click", {element: tree_node}));
        return [tree_node.remove("open")];
      })
      .commit("Clicking inside a child node of an open tree node closes it.", ({find}) => {
        let tree_node = find("editor/node-tree/node", {open: "true"});
        let child_node = find("editor/node-tree/node");
        child_node.node.parent == tree_node.node;
        find("html/event/click", {element: child_node});
        return [tree_node.remove("open")];
      })

      .commit("Clicking the delete node button removes its node from the block.", ({find, choose, gather, record}) => {
        let delete_node = find("editor/node-tree/node/delete");
        find("html/event/click", {element: delete_node})
        let {tree_node} = delete_node;
        let {node} = tree_node;
        let {active_block} = tree_node.tree.editor;
        return [
          active_block.remove("node", node),
          node.remove()
        ];
      })

      .commit("Clicking the new node button opens it.", ({find, not, record}) => {
        let new_node = find("editor/node-tree/node/new");
        not(() => new_node.open);
        find("html/event/click", {element: new_node})
        return [new_node.add("open", "true")];
      })
      .commit("Clicking outside an open new node closes it.", ({find, not, record}) => {
        let new_node = find("editor/node-tree/node/new", {open: "true"});
        find("html/event/click");
        not(() =>  find("html/event/click", {element: new_node}));
        return [new_node.remove("open")];
      })
      .commit("Clicking the new node save button commits and closes it.", ({find, not, record}) => {
        let save_new = find("editor/node-tree/node/new/save");
        find("html/event/click", {element: save_new});
        let {new_node} = save_new;
        let tag_autocomplete = find("editor/node-tree/node/new/tag");
        let {value} = tag_autocomplete;
        let tag_input = find("ui/autocomplete/input", {autocomplete: tag_autocomplete});
        value != "";
        let {tree} = new_node;
        let {active_block} = tree.editor;
        return [
          active_block.add("node", [
            record("node", {sort: 10, attribute: [
              record({attribute: "tag", value}) // @FIXME: need a key on these or multiple nodes AVs will collapse.
            ]})
          ]),
          new_node.remove("open"),
          tag_input.remove("value")
        ];
      })

      .commit("Clicking a field opens it.", ({find, not}) => {
        let field = find("editor/node-tree/node/pattern/field");
        find("html/event/click", {element: field});
        not(() => field.open);
        return [field.add("open", "true")];
      })
      .commit("Clicking outside an open field closes it.", ({find, not}) => {
        let field = find("editor/node-tree/node/pattern/field", {open: "true"});
        find("html/event/click");
        not(() =>  find("html/event/click", {element: field}));
        return [field.remove("open")];
      })

      .commit("Clicking the new field button adds a new attribute to the node.", ({find, choose, gather, record}) => {
        let add_field = find("editor/node-tree/node/field/new");
        let event = find("html/event/click", {element: add_field})
        let {tree_node} = add_field;
        let {node} = tree_node;
        let field_attribute = find("editor/node-tree/node/field/new/attribute", {tree_node});
        let {value} = field_attribute;
        value != "";

        // @FIXME: busted as frig...
        // let [count] = choose(() => {
        //   let {attribute} = node;
        //   1 == gather(attribute.sort).per(node).sort("down");
        //   return attribute.sort + 1;
        // }, () => 1);
        return [
          node.add("attribute", record("node/attribute", {sort: event, attribute: value})),
          field_attribute.remove("value")
        ];
      })
      .commit("Clicking the delete field button removes its attribute from the node.", ({find, choose, gather, record}) => {
        let delete_field = find("editor/node-tree/node/field/delete");
        find("html/event/click", {element: delete_field})
        let {tree_node, attribute} = delete_field;
        let {node} = tree_node;
        return [
          node.remove("attribute", attribute),
          attribute.remove()
        ];
      })
  }

  //--------------------------------------------------------------------
  // Header
  //--------------------------------------------------------------------

  queryEditor() {
    this.editor
      .block("Display a node tree for the active block.", ({find, record}) => {
        let content = find("editor/block/content", {type: "query"});
        let {editor} = content;
        return [
          content.add("children", [
            record("editor/node-tree", {editor}).add("node", [
              editor.active_block.node
            ])
          ])
        ]
      })
  }
}

Watcher.register("editor2", EditorWatcher);
