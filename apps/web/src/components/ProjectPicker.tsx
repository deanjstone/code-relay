import { useEffect, useState } from 'react'
import { listPackages, listProjects } from '../lib/api'

const ROOT_SENTINEL = '.(root)'

export interface ProjectSelection {
  project?: string
  subPath?: string
}

interface ProjectPickerProps {
  onChange: (selection: ProjectSelection) => void
}

export function ProjectPicker({ onChange }: ProjectPickerProps) {
  const [projects, setProjects] = useState<string[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [packages, setPackages] = useState<string[]>([])
  const [selectedPackage, setSelectedPackage] = useState('')

  useEffect(() => {
    listProjects()
      .then((result) => setProjects(result.projects ?? []))
      .catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setPackages([])
      setSelectedPackage('')
      onChange({})
      return
    }

    listPackages(selectedProject)
      .then((result) => setPackages((result.packages ?? []).map((p) => p.rel)))
      .catch(() => setPackages([]))
    setSelectedPackage('')
    onChange({ project: selectedProject, subPath: ROOT_SENTINEL })
  }, [selectedProject]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePackageChange(rel: string) {
    setSelectedPackage(rel)
    onChange({ project: selectedProject, subPath: rel || ROOT_SENTINEL })
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-indigo-300">Project (optional — default: Argus workspace)</span>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 focus:ring-violet-400"
        >
          <option value="">Argus workspace (default)</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </label>

      {selectedProject && packages.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-indigo-300">Package</span>
          <select
            value={selectedPackage}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 focus:ring-violet-400"
          >
            <option value="">{ROOT_SENTINEL}</option>
            {packages.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
