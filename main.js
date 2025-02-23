import "./style.css";
import OBR from "@owlbear-rodeo/sdk";
import { ID, sceneCache, roomCache } from './globals';
import { isBackgroundImage, isPlayerWithVision, isVisionFog }  from './itemFilters';
import { setupContextMenus, createActions, createMode, createTool, onSceneDataChange } from './visionTool';

// Create the extension page

const app = document.querySelector('#app');
app.style.textAlign = "left";
app.parentElement.style.placeItems = "start";

// Global for the default player range
console.log("Boop.init");

app.innerHTML = `
  <div>
    <div>
      <h1 style="display: inline-block; font-size: 2.2em;">Dynamic Fog&nbsp;&nbsp;</h1><input type="checkbox" id="vision_checkbox" class="large">
    </div>
    <hr>
    <div style="text-align: center;">
      <p style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width:16em">Map: <span id="map_name">No map selected</span></p>
      <p><span id="map_size">Please set your map as a background</span></p>
      <hr>
      <h2 style="margin-bottom: 0;">Vision Radius&nbsp;&nbsp;</h2><input class="token-vision-range" id="default-range" type="number" value="0">
      <p id="no_tokens_message">Enable vision on your character tokens</p>
      <div id="token_list_div" style="display: block;">
        <table style="margin: auto; padding: 0;"><tbody id="token_list">
        </tbody></table>
      </div>
      </div>
    <div id="debug_div" style="display: none;">
      <br><hr><br>
      <h2>Debug</h2>
      <h3>Performance Info</h3>
      <ul>
        <li><p>Compute time: <span id=compute_time>N/A</span></p></li>
        <li><p>Communication time: <span id=communication_time>N/A</span></p></li>
        <li><p>Cache hits/misses: <span id=cache_hits>?</span>/<span id=cache_misses>?</span></p></li>
      </ul>
    </div>
  </div>
`


async function setButtonHandler() {
  const visionCheckbox = document.getElementById("vision_checkbox");

  // The visionCheckbox element is responsible for toggling vision updates
  visionCheckbox.addEventListener("click", async event => {
    if (!sceneCache.ready) {
      event.preventDefault();
      return;
    }
    await OBR.scene.setMetadata({[`${ID}/visionEnabled`]: event.target.checked});
  }, false);
}

// Function to handle changing the default view distance. 
// immediatly sets the defaultRange var and updates the metadata.

async function setDefaultRange() {
  const dRange = document.getElementById("default-range");
  dRange.addEventListener("change", async event=> {
    const value = parseInt(event.target.value);
	if (!value)
	  event.target.value = 1;
        if (value < 1)
          event.target.value = 1;
        if (value > 999)
          event.target.value = 999;
     
    console.log("Boop.setDefaultRange:" + event.target.value);
    roomCache.metadata[`${ID}/visionDefRange`] = event.target.value;
    await OBR.room.setMetadata({[`${ID}/visionDefRange`]: event.target.value});
 }, false);

}




function updateUI(items)
{
  const table = document.getElementById("token_list");
  const message = document.getElementById("no_tokens_message");
  const visionCheckbox = document.getElementById("vision_checkbox");
  const playersWithVision = items.filter(isPlayerWithVision);

  if (sceneCache.metadata) 
    visionCheckbox.checked = sceneCache.metadata[`${ID}/visionEnabled`] == true;
    
// default vision is now held in the room metadata. Seems more stable 
// than per scene.
// If room metadata is available
  if (roomCache.metadata) {
// set the default range out of the metdata cache
    var defaultRange = roomCache.metadata[`${ID}/visionDefRange`];
// if its never been set for this room, initalize it with the contents
// of the html form and write it to the metadata.
    if (typeof defaultRange == "undefined") { 
      defaultRange = document.getElementById("default-range").value;	  
      OBR.scene.setMetadata({[`${ID}/visionDefRange`]: defaultRange });
      console.log("Boop.OnlyOnce:" + defaultRange);
    }
    console.log("Boo.AfterDefaultRangeset" + defaultRange);
  


// update the default form box with the current default range, 
// just to make sure we're all on the same page.
    var defRangeBox = document.getElementById("default-range");
    defRangeBox.value = defaultRange;
    console.log("AfterroomCache:" + defaultRange);
  }

  console.log("Boop.updateUI" + defaultRange);



  if (playersWithVision.length > 0)
    message.style.display = "none";
  else
    message.style.display = "block";

  const tokenTableEntries = document.getElementsByClassName("token-table-entry");
  const toRemove = [];
  for (const token of tokenTableEntries) {
    const tokenId = token.id.slice(3);
    if (playersWithVision.find(player => player.id === tokenId) === undefined)
      toRemove.push(token);
  }
  for (const token of toRemove)
    token.remove();

  for (const player of playersWithVision) {
    const tr = document.getElementById(`tr-${player.id}`);

    // curRange is the view range for existing players. Set to default if undef.
    const curRange =  player.metadata[`${ID}/visionRange`] ? player.metadata[`${ID}/visionRange`] : defaultRange;
    
    if (tr) {
      // Update with current information
      const name = tr.getElementsByClassName("token-name")[0]
      const rangeInput = tr.getElementsByClassName("token-vision-range")[0];
      const unlimitedCheckbox = tr.getElementsByClassName("unlimited-vision")[0];
      if (name)
        name.innerText = player.name;
      if (rangeInput) {
        if (!unlimitedCheckbox.checked)
          rangeInput.value = player.metadata[`${ID}/visionRange`] ? player.metadata[`${ID}/visionRange`] : defaultRange;
      }
      if (unlimitedCheckbox) {
        unlimitedCheckbox.checked = !player.metadata[`${ID}/visionRange`];
      }
      if (unlimitedCheckbox.checked)
        rangeInput.setAttribute("disabled", "disabled");
      else
        rangeInput.removeAttribute("disabled");
    }
    else {
      // Create new item for this token
      const newTr = document.createElement("tr");
      newTr.id = `tr-${player.id}`;
      newTr.className = "token-table-entry";
      // Per player setting interface
      newTr.innerHTML = `<td class="token-name">${player.name}</td><td><input class="token-vision-range" id="player-range" type="number" value="${curRange}"><span class="unit"></span></td><td>&nbsp;&nbsp;&infin;&nbsp<input type="checkbox" class="unlimited-vision"></td>`;
      table.appendChild(newTr);
      
      // Register event listeners
      const rangeInput = newTr.getElementsByClassName("token-vision-range")[0];
      const unlimitedCheckbox = newTr.getElementsByClassName("unlimited-vision")[0];
     
      // force update of vision metadata
      OBR.scene.items.updateItems([player], items => {
          items[0].metadata[`${ID}/visionRange`] = rangeInput.value;
        });

      rangeInput.addEventListener("change", async event => {
        const value = parseInt(event.target.value);
	if (typeof value == "undefined") 
	  event.target.value = 1;
        if (value < 1)
          event.target.value = 1;
        if (value > 999)
          event.target.value = 999;
        await OBR.scene.items.updateItems([player], items => {
          items[0].metadata[`${ID}/visionRange`] = parseInt(event.target.value);
        });
      }, false);

      // Hack to temp disable the unlimited checkboxes. Too easy to turn on
      // and the logic is a bit dodgy.
      
      unlimitedCheckbox.addEventListener("click", async event => {
//        let value = false;
//        if (event.target.checked)
//          rangeInput.setAttribute("disabled", "disabled");
//        else {
//          value = parseInt(rangeInput.value);
//          rangeInput.removeAttribute("disabled");
//        }
//        await OBR.scene.items.updateItems([player], items => {
//          items[0].metadata[`${ID}/visionRange`] = parseInt(value);
        });
//      }, false);
    }
  }
}

async function initScene(playerOrGM) 
{
  let fogFilled, fogColor;
  [sceneCache.items, sceneCache.metadata, roomCache.metadata, sceneCache.gridDpi, sceneCache.gridScale, fogFilled, fogColor] = await Promise.all([
    OBR.scene.items.getItems(),
    OBR.scene.getMetadata(),
    OBR.room.getMetadata(),
    OBR.scene.grid.getDpi(),
    OBR.scene.grid.getScale(),
    OBR.scene.fog.getFilled(),
    OBR.scene.fog.getColor()
  ]);
  OBR.scene.items.deleteItems(sceneCache.items.filter(isVisionFog));
  sceneCache.gridScale = sceneCache.gridScale.parsed.multiplier;
  sceneCache.fog = {filled: fogFilled, style: {color: fogColor, strokeWidth: 5}};

  let image = undefined;
  if (sceneCache.items.filter(isBackgroundImage).length == 0) {
    const images = sceneCache.items.filter(item => item.layer == "MAP" && item.type == "IMAGE");
    const areas = images.map(image => image.image.width * image.image.height / Math.pow(image.grid.dpi, 2));
    image = images[areas.indexOf(Math.max(...areas))];
  }

  if (playerOrGM == "GM")  {
    updateUI(sceneCache.items);

    if (image !== undefined) {
      await OBR.scene.items.updateItems([image], items => {
        items[0].metadata[`${ID}/isBackgroundImage`] = true;
      });
    }
  }
}

// Setup extension add-ons
OBR.onReady(() => {
  OBR.player.getRole().then(async value => {
    // Allow the extension to load for any player
    // This is now needed because each player updates their own
    // local fog paths.
    if (value == "GM") {
      setButtonHandler();
      setDefaultRange();
      setupContextMenus();
      createTool();
      createMode();
      createActions();
    }

    OBR.scene.fog.onChange(fog => {
      sceneCache.fog = fog;
    });

    OBR.scene.items.onChange(items => {
      sceneCache.items = items;
      if (sceneCache.ready) {
        if (value == "GM") updateUI(items);
        onSceneDataChange();
      }
    });

    OBR.scene.grid.onChange(grid => {
      sceneCache.gridDpi = grid.dpi;
      sceneCache.gridScale = parseInt(grid.scale);
      if (sceneCache.ready)
        onSceneDataChange();
    });

    OBR.scene.onMetadataChange(metadata => {
      sceneCache.metadata = metadata;
      if (sceneCache.ready)
        onSceneDataChange();
    });

    OBR.scene.onReadyChange(ready => {
      sceneCache.ready = ready;
      if (ready) {
        initScene(value);
        onSceneDataChange();
      }
      else if (value == "GM")
        updateUI([]);
    });

    sceneCache.ready = await OBR.scene.isReady();
    if (sceneCache.ready) {
      initScene(value);
      onSceneDataChange();
    }
    else if (value == "GM")
      updateUI([]);
  }
  )
});
