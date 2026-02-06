using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class CreateCourseDto
    {
        [Required]
        public string Name { get; set; }

        public string? Description { get; set; }
    }
}