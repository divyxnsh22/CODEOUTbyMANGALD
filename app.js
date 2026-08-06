(function () {
  "use strict";

  // ---------- language / extension map ----------
  var LANGUAGES = [
    { label: "Plain text", ext: "txt" },
    { label: "Python", ext: "py" },
    { label: "C", ext: "c" },
    { label: "C++", ext: "cpp" },
    { label: "C#", ext: "cs" },
    { label: "Java", ext: "java" },
    { label: "JavaScript", ext: "js" },
    { label: "TypeScript", ext: "ts" },
    { label: "HTML", ext: "html" },
    { label: "CSS", ext: "css" },
    { label: "SQL", ext: "sql" },
    { label: "JSON", ext: "json" },
    { label: "Markdown", ext: "md" },
    { label: "Shell", ext: "sh" }
  ];

  var EXT_TO_LABEL = {};
  LANGUAGES.forEach(function (l) { EXT_TO_LABEL[l.ext] = l.label; });

  // QR capacity: kept conservative so phone cameras scan reliably first try.
  var QR_SAFE_LIMIT = 900;
  var QR_CHUNK_SIZE = 700;

  // ---------- element refs ----------
  var $ = function (id) { return document.getElementById(id); };
  var codeEl = $("code");
  var gutterEl = $("gutter");
  var filenameEl = $("filename");
  var languageEl = $("language");
  var charCountEl = $("charCount");
  var lineCountEl = $("lineCount");
  var dropzone = $("dropzone");
  var fileInput = $("fileInput");
  var uploadBtn = $("uploadBtn");
  var clearBtn = $("clearBtn");
  var downloadBtn = $("downloadBtn");
  var copyBtn = $("copyBtn");
  var qrCanvas = $("qrCanvas");
  var qrEmpty = $("qrEmpty");
  var qrPager = $("qrPager");
  var qrPrev = $("qrPrev");
  var qrNext = $("qrNext");
  var qrPartLabel = $("qrPartLabel");
  var qrWarning = $("qrWarning");
  var toEmailEl = $("toEmail");
  var instantEmailBtn = $("instantEmailBtn");
  var mailtoBtn = $("mailtoBtn");
  var emailNote = $("emailNote");
  var toastEl = $("toast");

  var qrChunks = [];
  var qrIndex = 0;
  var qrDebounce = null;

  // ---------- populate language select ----------
  LANGUAGES.forEach(function (l) {
    var opt = document.createElement("option");
    opt.value = l.ext;
    opt.textContent = l.label;
    languageEl.appendChild(opt);
  });
  languageEl.value = "txt";

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  // ---------- gutter / counts ----------
  function refreshGutter() {
    var lines = codeEl.value.split("\n").length;
    var nums = [];
    for (var i = 1; i <= lines; i++) nums.push(i);
    gutterEl.textContent = nums.join("\n");
    gutterEl.scrollTop = codeEl.scrollTop;
    charCountEl.textContent = codeEl.value.length + " character" + (codeEl.value.length === 1 ? "" : "s");
    lineCountEl.textContent = lines + " line" + (lines === 1 ? "" : "s");
  }

  codeEl.addEventListener("input", function () {
    refreshGutter();
    clearTimeout(qrDebounce);
    qrDebounce = setTimeout(renderQR, 350);
  });
  codeEl.addEventListener("scroll", function () { gutterEl.scrollTop = codeEl.scrollTop; });

  // Tab key inserts spaces instead of moving focus
  codeEl.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var start = codeEl.selectionStart, end = codeEl.selectionEnd;
      codeEl.value = codeEl.value.slice(0, start) + "  " + codeEl.value.slice(end);
      codeEl.selectionStart = codeEl.selectionEnd = start + 2;
      refreshGutter();
    }
  });

  // ---------- file loading ----------
  function loadFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      codeEl.value = reader.result;
      var parts = file.name.split(".");
      var ext = parts.length > 1 ? parts.pop().toLowerCase() : "txt";
      var base = parts.join(".") || file.name;
      filenameEl.value = base;
      if (EXT_TO_LABEL[ext]) languageEl.value = ext;
      refreshGutter();
      renderQR();
      toast("Loaded " + file.name);
    };
    reader.onerror = function () { toast("Couldn't read that file"); };
    reader.readAsText(file);
  }

  uploadBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function (e) { loadFile(e.target.files[0]); });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragging");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  // ---------- clear ----------
  clearBtn.addEventListener("click", function () {
    if (!codeEl.value.trim() || confirm("Clear the editor? This can't be undone.")) {
      codeEl.value = "";
      filenameEl.value = "my-code";
      languageEl.value = "txt";
      refreshGutter();
      renderQR();
      toast("Cleared");
    }
  });

  // ---------- download ----------
  function currentFilename() {
    var base = (filenameEl.value || "my-code").trim().replace(/\.[^.]+$/, "");
    var ext = languageEl.value || "txt";
    return base + "." + ext;
  }

  downloadBtn.addEventListener("click", function () {
    if (!codeEl.value) { toast("Nothing to download yet"); return; }
    var blob = new Blob([codeEl.value], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = currentFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Downloaded " + currentFilename());
  });

  // ---------- copy ----------
  copyBtn.addEventListener("click", function () {
    if (!codeEl.value) { toast("Nothing to copy yet"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeEl.value).then(
        function () { toast("Copied to clipboard"); },
        function () { fallbackCopy(); }
      );
    } else {
      fallbackCopy();
    }
  });
  function fallbackCopy() {
    codeEl.select();
    try {
      document.execCommand("copy");
      toast("Copied to clipboard");
    } catch (e) {
      toast("Couldn't copy — select and copy manually");
    }
    codeEl.setSelectionRange(0, 0);
  }

  // ---------- QR ----------
  function chunkText(text, size) {
    var chunks = [];
    for (var i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
    return chunks;
  }

  function drawQR(payload) {
    if (typeof QRCode === "undefined") {
      qrWarning.textContent = "QR library failed to load — check your internet connection.";
      qrWarning.classList.remove("hidden");
      return;
    }
    QRCode.toCanvas(qrCanvas, payload, { errorCorrectionLevel: "M", margin: 1, width: 200 }, function (err) {
      if (err) {
        qrWarning.textContent = "Couldn't generate a QR code for this content.";
        qrWarning.classList.remove("hidden");
      }
    });
  }

  function renderQR() {
    var text = codeEl.value;
    var ctx = qrCanvas.getContext("2d");
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    qrWarning.classList.add("hidden");

    if (!text) {
      qrEmpty.classList.remove("hidden");
      qrPager.classList.add("hidden");
      return;
    }
    qrEmpty.classList.add("hidden");

    if (text.length <= QR_SAFE_LIMIT) {
      qrChunks = [text];
      qrIndex = 0;
      qrPager.classList.add("hidden");
      drawQR(text);
      return;
    }

    // Long code: split into a sequence of QR codes.
    var raw = chunkText(text, QR_CHUNK_SIZE);
    qrChunks = raw.map(function (part, i) {
      return "[" + currentFilename() + " part " + (i + 1) + "/" + raw.length + "]\n" + part;
    });
    qrIndex = 0;
    qrPager.classList.remove("hidden");
    qrPartLabel.textContent = "Part 1 of " + qrChunks.length;
    drawQR(qrChunks[0]);
    qrWarning.textContent = "This is long, so it's split into " + qrChunks.length + " QR codes — scan them in order, or use email/download instead for something this size.";
    qrWarning.classList.remove("hidden");
  }

  function showQrChunk(delta) {
    if (!qrChunks.length) return;
    qrIndex = (qrIndex + delta + qrChunks.length) % qrChunks.length;
    qrPartLabel.textContent = "Part " + (qrIndex + 1) + " of " + qrChunks.length;
    drawQR(qrChunks[qrIndex]);
  }
  qrPrev.addEventListener("click", function () { showQrChunk(-1); });
  qrNext.addEventListener("click", function () { showQrChunk(1); });

  // ---------- email ----------
  var cfg = window.CODEOUT_CONFIG || {};
  var emailReady = !!(cfg.EMAILJS_PUBLIC_KEY && cfg.EMAILJS_SERVICE_ID && cfg.EMAILJS_TEMPLATE_ID);

  if (emailReady && window.emailjs) {
    emailjs.init(cfg.EMAILJS_PUBLIC_KEY);
    emailNote.textContent = "Sends straight from your browser through EmailJS — nothing is stored on this computer.";
  } else {
    instantEmailBtn.disabled = true;
    emailNote.textContent = "Instant sending isn't set up on this copy of the site yet — use \"Open in mail app\" below, or scan the QR code instead.";
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  instantEmailBtn.addEventListener("click", function () {
    if (!codeEl.value) { toast("Nothing to send yet"); return; }
    if (!validEmail(toEmailEl.value)) { toast("Enter a valid email address"); return; }
    instantEmailBtn.disabled = true;
    instantEmailBtn.textContent = "Sending…";
    emailjs.send(cfg.EMAILJS_SERVICE_ID, cfg.EMAILJS_TEMPLATE_ID, {
      to_email: toEmailEl.value,
      subject: currentFilename(),
      message: codeEl.value
    }).then(function () {
      toast("Sent to " + toEmailEl.value);
      instantEmailBtn.disabled = false;
      instantEmailBtn.textContent = "Send instantly";
    }, function (err) {
      console.error(err);
      toast("Couldn't send — try the mail app option instead");
      instantEmailBtn.disabled = false;
      instantEmailBtn.textContent = "Send instantly";
    });
  });

  mailtoBtn.addEventListener("click", function () {
    if (!codeEl.value) { toast("Nothing to send yet"); return; }
    var subject = encodeURIComponent(currentFilename());
    var body = encodeURIComponent(codeEl.value);
    var to = validEmail(toEmailEl.value) ? encodeURIComponent(toEmailEl.value) : "";
    if (body.length > 1800) {
      toast("This is long for a mail link — if it opens empty, use QR or download instead");
    }
    window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
  });

  // ---------- init ----------
  refreshGutter();
  renderQR();
})();
