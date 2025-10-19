;; AutoCAD Startup File - Loads automatically when AutoCAD starts
;; Place this file in one of AutoCAD's support folders

(princ "\nLoading SurveyDisco customizations...")

;; Set attribute prompts OFF by default (since LISP commands will fill them)
(setvar "ATTREQ" 0)

;; Load SurveyDisco LISP commands
(load "fillproject.lsp")
(load "mapmap.lsp") 
(load "fillandmap.lsp")
(load "Txt2Att-V4.lsp")

;; Attribute control commands
(defun c:ATTOFF ()
  (setvar "ATTREQ" 0)
  (princ "\nAttribute prompts turned OFF")
  (princ)
)

(defun c:ATTON ()
  (setvar "ATTREQ" 1)
  (princ "\nAttribute prompts turned ON")
  (princ)
)

;; Startup message
(princ "\nSurveyDisco commands loaded:")
(princ "\n  FILLPROJ - Fill block attributes only")
(princ "\n  MAPMAP - Insert vicinity map only") 
(princ "\n  FILLANDMAP - Fill blocks + insert map")
(princ "\n  ATTOFF - Turn off attribute prompts")
(princ "\n  ATTON - Turn on attribute prompts")
(princ "\nAttribute prompts are OFF by default")
(princ)