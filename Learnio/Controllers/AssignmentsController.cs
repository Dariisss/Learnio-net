using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssignmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public AssignmentsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // GET: api/Assignments/course/{courseId}
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetAssignments(Guid courseId)
        {
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Deadline)
                .ToListAsync();
            return Ok(assignments);
        }

        // POST: api/Assignments
        [HttpPost]
        public async Task<IActionResult> CreateAssignment([FromForm] CreateAssignmentDto model)
        {
            string? filePath = null;

            // 1. Сохранение файла
            if (model.File != null)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + "_" + model.File.FileName;
                var fullPath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await model.File.CopyToAsync(stream);
                }

                filePath = "/uploads/" + uniqueFileName;
            }

            // 2. Создание задания
            var assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                CourseId = model.CourseId,
                Title = model.Title,          // 👈 ТЕПЕРЬ ТУТ Title
                Description = model.Description,
                Deadline = model.Deadline,
                MaxScore = model.MaxScore,
                AttachmentUrl = filePath
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(assignment);
        }
    }

    // DTO тоже меняем на Title
    public class CreateAssignmentDto
    {
        public Guid CourseId { get; set; }

        // 👇 БЫЛО Name, СТАЛО Title
        public string Title { get; set; }

        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public int MaxScore { get; set; }
        public IFormFile? File { get; set; }
    }
}