import { connectSession } from "rxq";
import { EngineVersion, GetDocList, OpenDoc } from "rxq/Global";
import { CreateSessionObject, DestroyVariableByName, DoSave } from "rxq/Doc";
import { GetLayout } from "rxq/GenericObject";
import { shareReplay, map, publish, filter, switchMap, elementAt, pluck, mergeMap, tap, withLatestFrom, concatAll, startWith } from "rxjs/operators";
import { fromEvent } from "rxjs";
import appSelector  from "./components";


// Define the configuration for your session
const config = {
    host: "localhost",
    port: 4848,
    isSecure: false
};

// Connect the session and share the Global handle
const session = connectSession(config);
const global$ = session.global$;

// Get the engineVersion
const engVer$ = global$.pipe(
  switchMap(h => h.ask(EngineVersion))
);

// Get the Doc List
const doclist$ = global$.pipe(
  switchMap(h => h.ask(GetDocList))
);

// Write the doc list to the DOM
doclist$.subscribe(dl => {
  document.querySelector("#docList").innerHTML += dl.map(doc => `<button class="dropdown-item" type="button">${doc.qDocName}</button>`).join("");
});


// Select values when a user clicks on them
//target.textContent
const selectApp$ = fromEvent(document.querySelector("div.dropdown-menu"), "click").pipe(
    map(sel => sel.target.textContent)
);

selectApp$.subscribe(t => console.log(t));

//change default button value to selected app
selectApp$.subscribe(sel =>
    document.querySelector("#ddBtn").textContent = sel
);

// Open app
const app$ = selectApp$.pipe(
    /* take the appid we get from selectApp$ and return an object
        that contains a new session config as well as the appid */
    map(appid => ({
      appid,
      config: {
        host: 'localhost',
        port: 4848,
        isSecure: false,
        appname: appid
      }
    })),
    // Create a new session using the new config
    switchMap(({ appid, config }) => connectSession(config).global$.pipe(
      // Open the app in this new session
      switchMap(globalHandle => globalHandle.ask(OpenDoc, appid)),
      shareReplay(1)
    ))
  )


//get variable list
const vbl$ = app$.pipe(
    switchMap(h => h.ask(CreateSessionObject, {
        "qInfo": {
            "qType": "VariableList"
        },
        "qVariableListDef": {
            "qType": "variable",
            "qShowReserved": true,
            "qShowConfig": true,
            "qData": {
                "tags": "/tags"
            }
        }
    })),
    shareReplay(1)
);


// Get the layout of the Generic Object
const vblLayout$ = vbl$.pipe(
    switchMap(h => h.invalidated$.pipe(
        startWith(h)
    )),
    switchMap(h => h.ask(GetLayout)),
    publish()
);

const vbLayout = vblLayout$.subscribe(v => {
    const vblCol = document.querySelector("#varList");
    while(vblCol.firstChild){
        vblCol.removeChild(vblCol.firstChild);
    }
    document.querySelector("#varList").innerHTML += `<h3> Select Variables to Destroy </h3>
        <hr>
        <div class="form-check" id=" selAllForm">
            <input class="form-check-input" type="checkbox" value="Select All" id="selAllChkBox">
            <label class="form-check-label" for="selAllChkBox">
                Select All
            </label>
        </div>
    `;

    v.qVariableList.qItems.map( vbl => {
        //console.log(vbl.qIsScriptCreated);
        let scriptCreated;
        if(vbl.qIsScriptCreated == true){
            scriptCreated = "disabled";
        }else
        {
            scriptCreated = "";
        };

        document.querySelector("#varList").innerHTML += `
        <div class="form-check" id="${vbl.qName}">
            <input class="form-check-input vars" type="checkbox" value="${vbl.qName}" ${scriptCreated}  id="${vbl.qName}">
            <label class="form-check-label" for="${vbl.qName}">
                ${vbl.qName}
            </label>
        </div>
        `;
    });
    document.querySelector("#varList").innerHTML += `
        <div>
            <button type="button" class="btn" id="destroyVars">Destroy Variables</button>
        </div>
    `;
});

vblLayout$.connect();

//Select All Oberservable
const selectAll$ = fromEvent(document.querySelector("#varList"), "change").pipe(
    map(sel => sel)
);

selectAll$.subscribe(chk => {
    if(chk.target.checked && chk.target.id == "selAllChkBox"){
        document.querySelectorAll("input.vars").forEach(chkBox => {
            if(!chkBox.disabled){
                chkBox.checked = true;
            }
        })
    }
});


//observarable for Destroy Variables Button

const destroy$ = fromEvent(document.querySelector("#varList"), "click").pipe(
    filter(e => e.target.id == "destroyVars"),
    map(des => {
        const newArray = [];
        const inputVars = document.querySelectorAll("input.vars").forEach(s => newArray.push({id: s.id, checked: s.checked}));
        const inputMap = newArray.filter(s => s.checked);
        //clear output
        const output = document.querySelector("#output");
        while(output.firstChild){
            output.removeChild(output.firstChild);
        }
        return inputMap;
    }),
    concatAll(),
//    tap(console.log),
    withLatestFrom(app$),
    switchMap(([v,h]) => {
        const output = document.querySelector("#output");
        output.innerHTML += `
            <p>${v.id}: </p>
        `;
        return h.ask(DestroyVariableByName, v.id);
    }),
    tap(console.log),

    publish()
);

//Save App
const save$= destroy$.pipe(
    //tap(console.log),
    withLatestFrom(app$),
    switchMap(([v,h], i = 0) => {
        console.log(i + "element");
        const output = document.querySelector("#output");
        if(v){
            output.querySelectorAll("p").forEach(e =>{
                e.textContent += "Successfully deleted";
            })
        }else{
            output.querySelectorAll("p").forEach(e =>{
                e.textContent += "Failed to delete";
            })
        };
        i = i + 1;
        return h.ask(DoSave);
    }),
    publish()
);


save$.connect();

destroy$.connect();



