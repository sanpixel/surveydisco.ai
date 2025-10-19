;;; Txt2Att-V4.lsp
;;; V4 — Always feeds rotation to ATTDEF, preserves height, rotation, style, layer,
;;; color, width factor, and justification (TEXT). Works in Block Editor.
;;; Keeps same justification as source text.

(vl-load-com)

(defun _plainText (s / r)
  (if (not s) (setq s ""))
  (setq r s)
  (foreach p (list "\\P" "\\p" "\\~" "\\L" "\\l" "\\O" "\\o" "\\K" "\\k" "\\W" "\\w" "\\A1" "\\A0")
    (setq r (vl-string-subst " " p r))
  )
  (while (and (vl-string-search "{\\" r) (vl-string-search ";" r) (vl-string-search "}" r))
    (setq r (strcat (substr r 1 (1+ (vl-string-search ";" r))) (substr r (1+ (vl-string-search "}" r)))))
  )
  (while (vl-string-search "  " r) (setq r (vl-string-subst " " "  " r)))
  (vl-string-right-trim " " (vl-string-left-trim " " r))
)

(defun _sanitizeTag (s / r)
  (if (not s) (setq s "TAG"))
  (setq s (_plainText s))
  (setq s (vl-string-translate "{}[]()<>/\\,:;\"'`~!@#$%^&*+=?|" "______________________________" s))
  (setq s (vl-string-subst "_" " " s))
  (setq s (vl-string-right-trim "_" (vl-string-left-trim "_" s)))
  (setq r (strcase s))
  (if (> (strlen r) 32) (setq r (substr r 1 32)))
  r
)

(defun _ensure-unique-tag (tag used / base n out)
  (setq base tag n 1 out tag)
  (while (vl-position out used) (setq out (strcat base "_" (itoa n))) (setq n (1+ n)))
  out
)

(defun _get-color-pairs (edata)
  (cond
    ((assoc 420 edata) (list (cons 420 (cdr (assoc 420 edata)))))
    ((assoc 62  edata) (list (cons 62  (cdr (assoc 62  edata)))))
    (T nil)
  )
)

(defun _entmake-attdef (edata default prompt tag / lay sty h pt rot wfac hjust vjust alpt color rec)
  (setq lay  (cdr (assoc 8 edata))
        sty  (cond ((cdr (assoc 7 edata))) (T "STANDARD"))
        h    (cond ((cdr (assoc 40 edata))) (T 2.5))
        pt   (cdr (assoc 10 edata))
        rot  (cond ((cdr (assoc 50 edata))) (T 0.0))
        wfac (cond ((cdr (assoc 41 edata))) (T 1.0))
        hjust (cond ((cdr (assoc 72 edata))) (T 0))
        vjust (cond ((cdr (assoc 73 edata))) (T 0))
        alpt (cond ((cdr (assoc 11 edata))) (T pt))
        color (_get-color-pairs edata)
  )
  (entmakex
    (append
      (list (cons 0 "ATTDEF") (cons 100 "AcDbEntity") (cons 8 lay))
      color
      (list
        (cons 100 "AcDbText")
        (cons 10 pt) (cons 40 h) (cons 1 default) (cons 50 rot) (cons 41 wfac)
        (cons 7 sty) (cons 72 hjust) (cons 73 vjust) (cons 11 alpt)
        (cons 100 "AcDbAttributeDefinition")
        (cons 2 tag) (cons 3 prompt) (cons 70 0)
      )
    )
  )
)

(defun _cmd-attdef (edata default prompt tag / pt h rot sty lay c1 before e oldDia oldReq hjust vjust alpt wfac)
  (setq pt  (cdr (assoc 10 edata))
        h   (cond ((cdr (assoc 40 edata))) (T 2.5))
        rot (cond ((cdr (assoc 50 edata))) (T 0.0))
        sty (cond ((cdr (assoc 7 edata)))  (T "STANDARD"))
        lay (cdr (assoc 8 edata))
        wfac (cond ((cdr (assoc 41 edata))) (T 1.0))
        hjust (cond ((cdr (assoc 72 edata))) (T 0))
        vjust (cond ((cdr (assoc 73 edata))) (T 0))
        alpt (cond ((cdr (assoc 11 edata))) (T pt))
        c1  (cond ((cdr (assoc 420 edata))) ((cdr (assoc 62 edata))) (T nil))
        before (entlast)
        oldDia (getvar "ATTDIA")
        oldReq (getvar "ATTREQ")
  )
  (setvar "ATTDIA" 0)
  (setvar "ATTREQ" 1)
  (setvar "CLAYER" lay)
  (setvar "TEXTSTYLE" sty)
  (setvar "TEXTSIZE" h)
  ;; Feed point AND rotation in same command call to avoid prompt
  (command "_.ATTDEF" "" tag prompt default pt rot)
  (setq e (entlast))
  (if (and e (not (eq e before)))
    (progn
      ;; enforce exact properties & justification
      (entmod (append (entget e)
                      (list (cons 50 rot) (cons 40 h) (cons 41 wfac)
                            (cons 72 hjust) (cons 73 vjust) (cons 11 alpt)
                            (cons 7 sty) (cons 8 lay))))
      (if c1
        (cond
          ((numberp c1) (entmod (append (entget e) (list (cons 62 c1)))))
          ((listp c1)   (entmod (append (entget e) (list (cons 420 c1)))))
        )
      )
      (setvar "ATTDIA" oldDia)
      (setvar "ATTREQ" oldReq)
      e)
    (progn (setvar "ATTDIA" oldDia) (setvar "ATTREQ" oldReq) nil))
)

(defun c:TXT2ATT ( / ss i en ed txt def tag used made newent)
  (princ "\nSelect TEXT/MTEXT to convert: ")
  (setq ss (ssget '((0 . "TEXT,MTEXT"))))
  (if ss
    (progn
      (setq used '() made 0)
      (repeat (setq i (sslength ss))
        (setq en (ssname ss (setq i (1- i))))
        (setq ed (entget en))
        (setq txt (_plainText (cdr (assoc 1 ed))))
        (setq def txt)
        (setq tag (_ensure-unique-tag (_sanitizeTag txt) used))
        (setq used (cons tag used))
        ;; try entmake first, fallback to command w/ rotation fed
        (setq newent (_entmake-attdef ed def txt tag))
        (if (not newent) (setq newent (_cmd-attdef ed def txt tag)))
        (if newent (progn (entdel en) (setq made (1+ made))))
      )
      (princ (strcat "\nActually created: " (itoa made) " attribute(s)."))
    )
    (princ "\nNothing selected.")
  )
  (princ)
)

(princ "\nLoaded: Txt2Att-V4 — run TXT2ATT.\n")
